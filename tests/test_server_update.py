"""Tests for the WarTab self-update system (server_update + routes)."""

import json
import socket
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest import mock

import server
import server_update


class TestUpdateToken(unittest.TestCase):
    """The mutating-update gate is never accidentally open."""

    def test_matches_explicit_env_token(self):
        with mock.patch.dict("os.environ", {"WARTAB_UPDATE_TOKEN": "secret-abc"}):
            server_update._token = None
            self.assertTrue(server_update.token_matches("secret-abc"))
            self.assertFalse(server_update.token_matches("secret-xyz"))
            self.assertFalse(server_update.token_matches(None))

    def test_fails_closed_when_no_token_available(self):
        with mock.patch.dict("os.environ", {}, clear=True):
            with mock.patch.object(server_update.Path, "read_text",
                                   side_effect=OSError("no token file")):
                server_update._token = None
                self.assertFalse(server_update.token_matches("anything"))

    def test_generates_persistent_token_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            with mock.patch.object(server_update, "HERE", Path(tmp)):
                with mock.patch.dict("os.environ", {}, clear=True):
                    server_update._token = None
                    first = server_update.update_token()
                    second = server_update.update_token()
                    self.assertEqual(first, second)  # stable within a run
                    tok_file = Path(tmp) / "data" / ".update_token"
                    self.assertTrue(tok_file.exists())
                    self.assertEqual(tok_file.read_text().strip(), first)


class TestRemoteRepoUrl(unittest.TestCase):
    """repo_url must never leak embedded credentials."""

    def test_strips_http_credentials(self):
        with mock.patch.object(server_update, "_run") as run:
            run.return_value = mock.Mock(
                returncode=0,
                stdout="http://cody:supersecret@10.0.0.137:3000/cody/wartab.git")
            self.assertEqual(
                server_update.remote_repo_url(),
                "http://10.0.0.137:3000/cody/wartab")

    def test_ssh_url_becomes_https(self):
        with mock.patch.object(server_update, "_run") as run:
            run.return_value = mock.Mock(
                returncode=0, stdout="git@github.com:warmbo/wartab.git")
            self.assertEqual(server_update.remote_repo_url(),
                             "https://github.com/warmbo/wartab")

    def test_falls_back_to_github(self):
        with mock.patch.object(server_update, "_run") as run:
            run.return_value = mock.Mock(returncode=1, stdout="")
            self.assertEqual(server_update.remote_repo_url(), "https://github.com")


class TestAncestorGuard(unittest.TestCase):
    """A remote that is an ancestor of the running build is NOT an update."""

    def _status(self, remote="ddd"):
        with mock.patch.object(server_update, "current_branch",
                               return_value="main"), \
             mock.patch.object(server_update, "current_commit",
                               return_value="ccc"), \
             mock.patch.object(server_update, "_fetch_remote_branch",
                               return_value=True), \
             mock.patch.object(server_update, "_remote_commit",
                               return_value=remote), \
             mock.patch.object(server_update, "_remote_commit_date",
                               return_value="2026-08-11T00:00:00+00:00"), \
             mock.patch.object(server_update, "remote_repo_url",
                               return_value="https://github.com/warmbo/wartab"):
            return server_update._build_status()

    def test_available_only_when_remote_ahead(self):
        # remote (aaa) is an ancestor of current (ccc) => NO update.
        with mock.patch.object(server_update, "_is_ancestor",
                               return_value=True):
            result = self._status(remote="aaa")
        self.assertFalse(result["update_available"])

    def test_remote_with_new_commits_is_update(self):
        with mock.patch.object(server_update, "_is_ancestor",
                               return_value=False):
            result = self._status(remote="ddd")
        self.assertTrue(result["update_available"])
        self.assertEqual(result["available_commit"], "ddd")

    def test_same_commit_not_update(self):
        result = self._status(remote="ccc")
        self.assertFalse(result["update_available"])


class TestStatusCache(unittest.TestCase):
    """status() returns cached results within the TTL and fetches after."""

    def test_cached_within_ttl_no_refetch(self):
        with mock.patch.object(server_update, "_build_status") as build:
            build.return_value = {"current_commit": "x",
                                  "update_available": False}
            server_update._cached_status = None
            server_update._cached_at = 0.0
            server_update.status(refresh=True)   # prime
            server_update.status()               # cached
            self.assertEqual(build.call_count, 1)

    def test_refresh_bypasses_cache(self):
        with mock.patch.object(server_update, "_build_status") as build:
            build.return_value = {"current_commit": "x",
                                  "update_available": False}
            server_update._cached_status = None
            server_update._cached_at = 0.0
            server_update.status(refresh=True)
            server_update.status(refresh=True)
            self.assertEqual(build.call_count, 2)


class TestUpdateRoutes(unittest.TestCase):
    """HTTP routing + auth gate for /api/update*."""

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        (self.root / "index.html").write_text("<html>WarTab</html>")
        self.original_here = server.HERE
        self.original_uploads = server.UPLOADS
        server.HERE = self.root
        server.UPLOADS = self.root / "uploads"
        server.UPLOADS.mkdir()
        self.httpd = server.http.server.ThreadingHTTPServer(
            ("127.0.0.1", 0), server.WarTabHandler
        )
        self.thread = threading.Thread(target=self.httpd.serve_forever)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.httpd.server_port}"

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join()
        server.HERE = self.original_here
        server.UPLOADS = self.original_uploads
        self.temporary.cleanup()

    def request(self, path, *, data=None, method=None, token=None):
        headers = {}
        if token:
            headers["X-WarTab-Update-Token"] = token
        req = urllib.request.Request(self.base_url + path, data=data,
                                     method=method, headers=headers)
        try:
            with urllib.request.urlopen(req) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.read()

    @mock.patch.dict("os.environ", {"WARTAB_UPDATE_TOKEN": "tok-123"}, clear=False)
    def test_update_status_requires_no_token(self):
        with mock.patch.object(server_update, "status",
                               return_value={"update_available": False,
                                             "current_commit": "abc"}):
            status, body = self.request("/api/update/status")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["current_commit"], "abc")

    @mock.patch.dict("os.environ", {"WARTAB_UPDATE_TOKEN": "tok-123"}, clear=False)
    def test_update_post_rejects_bad_token(self):
        status, body = self.request("/api/update", method="POST", token="wrong")
        self.assertEqual(status, 401)
        self.assertEqual(json.loads(body), {"error": "unauthorized"})

    @mock.patch.dict("os.environ", {"WARTAB_UPDATE_TOKEN": "tok-123"}, clear=False)
    def test_update_post_requires_token(self):
        status, _ = self.request("/api/update", method="POST")
        self.assertEqual(status, 401)

    @mock.patch.dict("os.environ", {"WARTAB_UPDATE_TOKEN": "tok-123"}, clear=False)
    def test_update_post_starts_apply_with_valid_token(self):
        with mock.patch.object(server_update, "apply_async") as apply_mock:
            status, body = self.request("/api/update", method="POST",
                                        token="tok-123")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"status": "started"})
        apply_mock.assert_called_once()

    @mock.patch.dict("os.environ", {"WARTAB_UPDATE_TOKEN": "tok-123"}, clear=False)
    def test_rollback_gated_and_dispatches(self):
        with mock.patch.object(server_update, "rollback_async") as rb:
            status, body = self.request("/api/update/rollback", method="POST",
                                        token="tok-123")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"status": "started"})
        rb.assert_called_once()

    @mock.patch.dict("os.environ", {"WARTAB_UPDATE_TOKEN": "tok-123"}, clear=False)
    def test_update_log_requires_token(self):
        status, _ = self.request("/api/update/log?after=0")
        self.assertEqual(status, 401)
        with mock.patch.object(server_update, "get_update_log",
                               return_value={"entries": [], "last": 0,
                                             "active": False}):
            status, body = self.request("/api/update/log?after=0",
                                        token="tok-123")
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body), {"entries": [], "last": 0,
                                            "active": False})


class TestApplyUpdate(unittest.TestCase):
    def test_already_up_to_date_no_restart(self):
        with mock.patch.object(server_update, "current_commit",
                               return_value="abc123"), \
             mock.patch.object(server_update, "_fetch_remote_branch",
                               return_value=True), \
             mock.patch.object(server_update, "_remote_commit",
                               return_value="abc123"):
            result = server_update.apply_update()
        self.assertTrue(result["ok"])
        self.assertFalse(result["restarted"])
        self.assertEqual(result["message"], "already up to date")

    def test_no_downgrade_guard(self):
        with mock.patch.object(server_update, "current_commit",
                               return_value="zzz999"), \
             mock.patch.object(server_update, "_fetch_remote_branch",
                               return_value=True), \
             mock.patch.object(server_update, "_remote_commit",
                               return_value="aaa111"), \
             mock.patch.object(server_update, "_is_ancestor",
                               return_value=True):
            result = server_update.apply_update()
        self.assertFalse(result["ok"])
        self.assertIn("no downgrade", result["error"])

    def test_failed_fetch_aborts(self):
        with mock.patch.object(server_update, "current_commit",
                               return_value="abc123"), \
             mock.patch.object(server_update, "_fetch_remote_branch",
                               return_value=False):
            result = server_update.apply_update()
        self.assertFalse(result["ok"])
        self.assertIn("fetch", result["error"])


if __name__ == "__main__":
    unittest.main()
