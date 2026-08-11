#!/usr/bin/env python3
"""WarTab self-update support (stdlib only — no third-party deps).

The instance is expected to be a git checkout. ``apply_update`` fetches the
configured remote/branch, snapshots config.json, records the current commit
for rollback, resets the working tree to the remote commit, then exits the
process — the systemd unit has ``Restart=always`` so the service comes back up
on the new build. No pip step is needed (WarTab is pure stdlib).

Security: the mutating endpoints (POST /api/update, /api/update/rollback) are
gated behind a shared secret (``WARTAB_UPDATE_TOKEN`` env or
``data/.update_token``). Git only ever fetches from the configured remote —
no arbitrary URLs are consulted. A no-downgrade guard refuses any update whose
target commit is an ancestor of the running build.

Design (improvements over the Bark update system this is modelled on):
  * Status is CACHED with a TTL so the dashboard does not ``git fetch`` on
    every poll — fetching is network-bound and slow.
  * A process-wide lock serialises concurrent apply/rollback calls.
  * ``apply_update`` records the pre-update HEAD so the user can ROLL BACK to
    the exact build that was running (Bark relies on the remote being behind;
    here rollback is explicit).
  * config.json is snapshotted before the checkout moves (belt-and-braces;
    it is gitignored so ``git reset --hard`` would not clobber it anyway).
"""

from __future__ import annotations

import json
import logging
import os
import secrets
import subprocess
import threading
import time
from pathlib import Path

log = logging.getLogger("wartab.update")

HERE = Path(__file__).resolve().parent

# ── Configuration ─────────────────────────────
UPDATE_REMOTE = os.environ.get("WARTAB_UPDATE_REMOTE", "origin")
UPDATE_BRANCH = os.environ.get("WARTAB_UPDATE_BRANCH", "main")
STATUS_TTL = float(os.environ.get("WARTAB_UPDATE_STATUS_TTL", "60"))
# Shared secret for the mutating endpoints. Loaded once at import; if unset we
# fall back to ``data/.update_token`` (auto-created on first update/check).
_token: str | None = None

# ── Live terminal log ─────────────────────────
# Mirrors the Bark pattern: entries get an incrementing seq so the UI can poll
# with ?after=<seq> and only receive new lines.
_update_log: list[dict] = []
_update_log_lock = threading.Lock()
_update_log_active = False
_apply_lock = threading.Lock()
_MAX_LOG_ENTRIES = 500

# ── Status cache ──────────────────────────────
_cache_lock = threading.Lock()
_cached_status: dict | None = None
_cached_at = 0.0


# ── Token gate ────────────────────────────────
def update_token() -> str:
    """The shared secret guarding mutating update endpoints.

    Prefers the env var; else reads ``data/.update_token``, creating it with a
    random value on first use so the gate is never accidentally open.
    """
    global _token
    if _token:
        return _token
    env = os.environ.get("WARTAB_UPDATE_TOKEN", "").strip()
    if env:
        _token = env
        return _token
    data_dir = HERE / "data"
    token_file = data_dir / ".update_token"
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
        if not token_file.exists():
            token_file.write_text(secrets.token_urlsafe(32), encoding="utf-8")
            try:
                os.chmod(token_file, 0o600)
            except OSError:
                pass
        _token = token_file.read_text(encoding="utf-8").strip()
    except OSError as exc:
        log.warning("could not read/init update token: %s", exc)
        _token = ""
    return _token


def token_matches(supplied: str | None) -> bool:
    token = update_token()
    if not token:
        # No token configured anywhere — refuse to mutate (fail closed).
        return False
    return secrets.compare_digest(supplied or "", token)


# ── git helpers ───────────────────────────────
def repo_root() -> Path:
    return HERE


def _run(
    cmd: list[str], *, timeout: int = 60, check: bool = False
) -> subprocess.CompletedProcess[str]:
    log.debug("git: %s", " ".join(cmd))
    result = subprocess.run(
        cmd, capture_output=True, text=True, timeout=timeout, cwd=repo_root()
    )
    if check and result.returncode != 0:
        raise RuntimeError(
            f"command failed ({result.returncode}): {' '.join(cmd)}\n"
            f"{result.stderr[-500:]}"
        )
    return result


def _run_u(
    cmd: list[str], *, timeout: int = 60, check: bool = False
) -> subprocess.CompletedProcess[str]:
    """Run a command and mirror it + its output into the live terminal log."""
    log_line("$ " + " ".join(cmd), "cmd")
    try:
        result = _run(cmd, timeout=timeout, check=check)
    except Exception as exc:
        log_line(f"error: {exc}", "error")
        raise
    for line in (result.stdout or "").splitlines():
        log_line(line)
    for line in (result.stderr or "").splitlines():
        log_line(line, "error" if result.returncode else "warn")
    return result


def current_commit() -> str:
    result = _run(["git", "rev-parse", "HEAD"])
    return result.stdout.strip() if result.returncode == 0 else "unknown"


def current_branch() -> str:
    result = _run(["git", "branch", "--show-current"])
    return result.stdout.strip() if result.returncode == 0 else ""


def _remote_commit(remote: str, branch: str) -> str:
    result = _run(["git", "rev-parse", f"{remote}/{branch}"])
    return result.stdout.strip() if result.returncode == 0 else ""


def _remote_commit_date(remote: str, branch: str) -> str:
    result = _run(["git", "log", "-1", "--format=%cI", f"{remote}/{branch}"])
    return result.stdout.strip() if result.returncode == 0 else ""


def _fetch_remote_branch(remote: str, branch: str) -> bool:
    result = _run(["git", "fetch", remote, branch], timeout=120)
    return result.returncode == 0


def _is_ancestor(ancestor: str, descendant: str) -> bool:
    result = _run(["git", "merge-base", "--is-ancestor", ancestor, descendant])
    return result.returncode == 0


def remote_repo_url() -> str:
    result = _run(["git", "remote", "get-url", UPDATE_REMOTE])
    if result.returncode != 0 or not result.stdout.strip():
        return "https://github.com"
    url = result.stdout.strip()
    # Strip embedded credentials (e.g. http://user:token@host/...) — the URL
    # may surface in the UI and must never leak a remote's auth token.
    if "://" in url:
        scheme, _, rest = url.partition("://")
        if "@" in rest:
            rest = rest.rsplit("@", 1)[1]
        url = f"{scheme}://{rest}"
    if url.startswith("git@"):
        url = "https://" + url[4:].replace(":", "/")
    return url.rstrip(".git")


# ── terminal log API ──────────────────────────
def log_line(line: str, level: str = "info") -> None:
    with _update_log_lock:
        _update_log.append(
            {"seq": len(_update_log) + 1, "ts": time.strftime("%H:%M:%S"),
             "level": level, "line": line}
        )
        if len(_update_log) > _MAX_LOG_ENTRIES:
            del _update_log[: len(_update_log) - _MAX_LOG_ENTRIES]


def clear_update_log() -> None:
    with _update_log_lock:
        _update_log.clear()


def get_update_log(after: int = 0) -> dict:
    with _update_log_lock:
        entries = [e for e in _update_log if e["seq"] > after]
        last = _update_log[-1]["seq"] if _update_log else 0
        return {"entries": entries, "last": last, "active": _update_log_active}


def set_update_active(active: bool) -> None:
    global _update_log_active
    _update_log_active = active


# ── status ────────────────────────────────────
def _build_status() -> dict:
    branch = current_branch()
    current = current_commit()
    error = ""
    available = ""
    available_date = ""
    try:
        if not _fetch_remote_branch(UPDATE_REMOTE, UPDATE_BRANCH):
            error = f"could not fetch {UPDATE_REMOTE}/{UPDATE_BRANCH}"
        else:
            available = _remote_commit(UPDATE_REMOTE, UPDATE_BRANCH)
            if available:
                available_date = _remote_commit_date(UPDATE_REMOTE, UPDATE_BRANCH)
    except Exception as exc:  # network down / not a checkout
        log.warning("Update check failed: %s", exc)
        error = str(exc)

    # Update is available iff the remote has commits we do NOT have yet.
    # A remote that is an ancestor of the running build is NOT an update.
    update_available = False
    if available and available != current:
        update_available = not _is_ancestor(available, current)

    return {
        "channel": "stable" if branch != "dev" else "dev",
        "branch": branch,
        "update_branch": UPDATE_BRANCH,
        "current_commit": current,
        "available_commit": available,
        "available_date": available_date,
        "update_available": update_available,
        "repo_url": remote_repo_url(),
        "repo_dir": str(repo_root()),
        "error": error,
    }


def status(*, refresh: bool = False) -> dict:
    """Return cached status; ``refresh=True`` bypasses the TTL cache."""
    global _cached_status, _cached_at
    with _cache_lock:
        if (
            not refresh
            and _cached_status is not None
            and (time.time() - _cached_at) < STATUS_TTL
        ):
            return dict(_cached_status)
        status_data = _build_status()
        _cached_status = dict(status_data)
        _cached_at = time.time()
        return status_data


# ── config snapshot ───────────────────────────
def _snapshot_config() -> str | None:
    """Snapshot config.json into snapshots/ and return the snapshot name."""
    cfg = HERE / "config.json"
    if not cfg.exists():
        return None
    try:
        snap_dir = HERE / "snapshots"
        snap_dir.mkdir(parents=True, exist_ok=True)
        name = time.strftime("pre_update_%Y%m%d_%H%M%S.json")
        (snap_dir / name).write_text(cfg.read_text(encoding="utf-8"),
                                     encoding="utf-8")
        return name
    except OSError as exc:
        log.warning("config snapshot failed: %s", exc)
        return None


# ── apply / rollback ──────────────────────────
def apply_update() -> dict:
    """Fetch and reset the working tree to ``UPDATE_REMOTE/UPDATE_BRANCH``.

    Returns before the caller exits the process; systemd restarts the unit.
    """
    with _apply_lock:
        clear_update_log()
        set_update_active(True)
        try:
            old_commit = current_commit()
            branch = current_branch()
            log_line(f"Updating WarTab from '{UPDATE_REMOTE}/{UPDATE_BRANCH}'",
                     "header")
            log_line(f"Current build: {old_commit[:10]}", "dim")
            try:
                if not _fetch_remote_branch(UPDATE_REMOTE, UPDATE_BRANCH):
                    log_line(f"git fetch failed: {UPDATE_REMOTE}/{UPDATE_BRANCH}",
                             "error")
                    return {"ok": False,
                            "error": f"could not fetch {UPDATE_REMOTE}/{UPDATE_BRANCH}"}
            except Exception as exc:
                log_line(f"fetch failed: {exc}", "error")
                return {"ok": False, "error": f"fetch failed: {exc}"}

            available = _remote_commit(UPDATE_REMOTE, UPDATE_BRANCH)
            if not available:
                log_line(f"could not resolve {UPDATE_REMOTE}/{UPDATE_BRANCH}",
                         "error")
                return {"ok": False,
                        "error": f"could not resolve {UPDATE_REMOTE}/{UPDATE_BRANCH}"}
            if available == old_commit:
                log_line(f"✓ Already up to date at {old_commit[:10]}",
                         "ok")
                return {"ok": True, "restarted": False,
                        "message": "already up to date"}

            # No-downgrade guard.
            if _is_ancestor(available, old_commit):
                log_line(
                    f"remote {UPDATE_REMOTE}/{UPDATE_BRANCH} is behind this "
                    f"instance ({available[:10]} vs {old_commit[:10]}) — "
                    f"no downgrade applied", "error")
                return {"ok": False,
                        "error": "remote is behind this instance — no downgrade"}

            # Snapshot config + record old HEAD for rollback.
            snap = _snapshot_config()
            if snap:
                log_line(f"✓ config.json snapshotted as {snap}", "ok")
            else:
                log_line("config.json unchanged — no snapshot needed", "dim")
            rollback_file = HERE / "data" / ".wartab_rollback_commit"
            try:
                rollback_file.parent.mkdir(parents=True, exist_ok=True)
                rollback_file.write_text(old_commit + "\n", encoding="utf-8")
            except OSError as exc:
                log_line(f"warning: could not record rollback commit: {exc}",
                         "warn")

            log_line(f"$ git reset --hard {UPDATE_REMOTE}/{UPDATE_BRANCH}", "cmd")
            try:
                _run_u(["git", "reset", "--hard", f"{UPDATE_REMOTE}/{UPDATE_BRANCH}"],
                       timeout=120, check=True)
            except Exception as exc:
                log_line(f"reset failed: {exc}", "error")
                return {"ok": False, "error": f"reset failed: {exc}"}

            new_commit = current_commit()
            log_line(f"✓ Update applied: {old_commit[:10]} → {new_commit[:10]}",
                     "ok")
            log_line("Restarting the process — the dashboard will reconnect in "
                     "a few seconds…", "dim")
            return {"ok": True, "restarted": True, "old_commit": old_commit,
                    "new_commit": new_commit, "snapshot": snap}
        finally:
            set_update_active(False)


def rollback() -> dict:
    """Reset the working tree back to the commit recorded before the last
    update. Returns the target commit (or an error)."""
    with _apply_lock:
        clear_update_log()
        set_update_active(True)
        try:
            rollback_file = HERE / "data" / ".wartab_rollback_commit"
            if not rollback_file.exists():
                log_line("No rollback point recorded — nothing to roll back to",
                         "error")
                return {"ok": False, "error": "no rollback point recorded"}
            target = rollback_file.read_text(encoding="utf-8").strip()
            current = current_commit()
            if not target or target == current:
                log_line("✓ Already at the rollback commit", "ok")
                return {"ok": True, "restarted": False,
                        "message": "already at rollback commit"}
            if not _run(["git", "cat-file", "-e", target]).returncode == 0:
                log_line(f"rollback commit {target[:10]} no longer exists", "error")
                return {"ok": False, "error": "rollback commit missing"}
            log_line(f"Rolling back to {target[:10]}", "header")
            _run_u(["git", "reset", "--hard", target], timeout=120, check=True)
            log_line(f"✓ Rolled back: {current[:10]} → {current_commit()[:10]}",
                     "ok")
            log_line("Restarting the process…", "dim")
            return {"ok": True, "restarted": True, "old_commit": current,
                    "new_commit": current_commit()}
        finally:
            set_update_active(False)


# ── background apply (used by the API) ────────
def apply_async(result_cb=None):
    """Run apply in a worker thread; on success the process exits for systemd.

    ``result_cb`` is called with the result dict (never blocks the thread
    path); the process exits only when ``result.get('restarted')`` is truthy.
    """
    import os as _os

    def _worker():
        try:
            result = apply_update()
        except Exception as exc:
            log.exception("apply_update failed")
            result = {"ok": False, "error": str(exc)}
        if result_cb:
            try:
                result_cb(result)
            except Exception:
                log.exception("result callback failed")
        if result.get("restarted"):
            log.info("Exiting process for restart (pid %s)", _os.getpid())
            _os._exit(0)

    t = threading.Thread(target=_worker, name="wartab-update", daemon=True)
    t.start()
    return t


def rollback_async(result_cb=None):
    """Run rollback in a worker thread; exit for systemd on success."""
    import os as _os

    def _worker():
        try:
            result = rollback()
        except Exception as exc:
            log.exception("rollback failed")
            result = {"ok": False, "error": str(exc)}
        if result_cb:
            try:
                result_cb(result)
            except Exception:
                log.exception("result callback failed")
        if result.get("restarted"):
            log.info("Exiting process for rollback restart (pid %s)",
                     _os.getpid())
            _os._exit(0)

    t = threading.Thread(target=_worker, name="wartab-rollback", daemon=True)
    t.start()
    return t
