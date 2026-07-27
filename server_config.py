"""Atomic, thread-safe persistence for WarTab configuration snapshots."""

from __future__ import annotations

import json
import os
import tempfile
import re
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any, Callable


def validate_config(data):
    """Validate the persisted config shape accepted by the HTTP API."""
    if not isinstance(data, dict):
        return False, "config must be a JSON object"
    has_pages = isinstance(data.get("pages"), (dict, list)) and bool(data["pages"])
    has_cards = isinstance(data.get("cards"), list)
    if not has_pages and not has_cards:
        return False, "missing 'pages' or 'cards' array"
    data_urls = re.findall(r'data:[^,]{0,30},[A-Za-z0-9+/=]{100,}', json.dumps(data))
    if data_urls:
        return False, "config contains {} embedded data URLs — use file paths instead".format(len(data_urls))
    if not isinstance(data.get("theme"), dict):
        return False, "missing 'theme' object"
    if not all(field in data["theme"] for field in ("bgType", "bgValue", "glow")):
        return False, "theme missing required fields (bgType, bgValue, glow)"
    if not isinstance(data.get("layout"), dict):
        return False, "missing 'layout' object"
    if not isinstance(data["layout"].get("cols"), (int, float)):
        return False, "layout missing valid 'cols'"
    return True, "ok"


def atomic_write_json(path: Path, data: Any) -> None:
    """Serialize *data* and atomically replace *path* from its directory."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_name = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix=f".{path.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary:
            temporary_name = temporary.name
            json.dump(data, temporary, indent=2)
            temporary.flush()
            os.fsync(temporary.fileno())
        os.replace(temporary_name, path)
    finally:
        if temporary_name:
            try:
                os.unlink(temporary_name)
            except FileNotFoundError:
                pass


class ConfigStorage:
    """Coordinate config snapshots and atomic replacement within one process."""

    def __init__(
        self,
        config_path: Path,
        snapshot_dir: Path,
        *,
        max_snapshots: int = 20,
        timestamp: Callable[[], str] | None = None,
    ) -> None:
        self.config_path = Path(config_path)
        self.snapshot_dir = Path(snapshot_dir)
        self.max_snapshots = max_snapshots
        self._timestamp = timestamp or (
            lambda: datetime.now().strftime("%Y%m%d_%H%M%S")
        )
        self._lock = Lock()

    def save(self, data: Any) -> None:
        """Snapshot the current config, then atomically save *data*."""
        with self._lock:
            if self.config_path.exists():
                self.snapshot_dir.mkdir(parents=True, exist_ok=True)
                snapshot = self._next_snapshot_path(self._timestamp())
                snapshot.write_bytes(self.config_path.read_bytes())
                self._prune()
            atomic_write_json(self.config_path, data)

    def restore(
        self,
        snapshot_name: str,
        validate: Callable[[Any], tuple[bool, str]],
    ) -> Any:
        """Validate a snapshot and atomically make it the active config."""
        with self._lock:
            snapshot = self.snapshot_dir / f"config_{snapshot_name}.json"
            data = json.loads(snapshot.read_text(encoding="utf-8"))
            valid, message = validate(data)
            if not valid:
                raise ValueError(message)
            atomic_write_json(self.config_path, data)
            return data

    def _next_snapshot_path(self, timestamp: str) -> Path:
        candidate = self.snapshot_dir / f"config_{timestamp}.json"
        sequence = 1
        while candidate.exists():
            candidate = self.snapshot_dir / f"config_{timestamp}_{sequence:03d}.json"
            sequence += 1
        return candidate

    def _prune(self) -> None:
        snapshots = sorted(
            self.snapshot_dir.glob("config_*.json"), reverse=True
        )
        for old in snapshots[self.max_snapshots :]:
            old.unlink()
