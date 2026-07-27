"""Tests for WarTab server utilities using unittest."""
import json
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest import mock

HERE = Path(__file__).parent.parent


def _import_server():
    """Dynamically import server module."""
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "server", str(HERE / "server.py")
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestValidateConfig(unittest.TestCase):
    """Validate the config validation logic."""

    @classmethod
    def setUpClass(cls):
        cls.server = _import_server()

    def _make_minimal(self, **overrides):
        """Build a minimal valid config with optional overrides."""
        cfg = {
            "theme": {"bgType": "gradient", "bgValue": "#000", "glow": "#888"},
            "layout": {"cols": 4},
            "cards": [{"id": "c1", "title": "X", "icon": "x",
                        "color": "#888", "width": 1,
                        "sections": [{"id": "s1", "type": "notes"}]}],
        }
        cfg.update(overrides)
        return cfg

    def test_valid_config(self):
        cfg = self._make_minimal()
        valid, msg = self.server.validate_config(cfg)
        self.assertTrue(valid, f"Expected valid, got: {msg}")

    def test_missing_theme(self):
        cfg = {"cards": [], "layout": {"cols": 4}}
        valid, msg = self.server.validate_config(cfg)
        self.assertFalse(valid)
        self.assertIn("theme", msg)

    def test_missing_layout_cols(self):
        cfg = {
            "theme": {"bgType": "gradient", "bgValue": "#000", "glow": "#888"},
            "layout": {"gap": 16},
            "cards": [],
        }
        valid, msg = self.server.validate_config(cfg)
        self.assertFalse(valid)
        self.assertIn("cols", msg)

    def test_rejects_embedded_data_urls(self):
        data_url = "data:image/png;base64," + "A" * 200
        cfg = self._make_minimal(theme={
            "bgType": "image", "bgValue": data_url, "glow": "#888"
        })
        valid, msg = self.server.validate_config(cfg)
        self.assertFalse(valid)
        self.assertIn("data URL", msg)

    def test_rejects_non_dict_input(self):
        valid, msg = self.server.validate_config("not a dict")
        self.assertFalse(valid)

    def test_requires_cards_or_pages(self):
        cfg = {
            "theme": {"bgType": "gradient", "bgValue": "#000", "glow": "#888"},
            "layout": {"cols": 4},
        }
        valid, msg = self.server.validate_config(cfg)
        self.assertFalse(valid)

    def test_accepts_pages_without_cards(self):
        cfg = {
            "theme": {"bgType": "gradient", "bgValue": "#000", "glow": "#888"},
            "layout": {"cols": 4},
            "pages": [{"id": "p1", "cards": [{"id": "c1", "sections": []}]}],
            "cards": [],
        }
        valid, msg = self.server.validate_config(cfg)
        self.assertTrue(valid, f"Expected valid, got: {msg}")


class TestConfigStorage(unittest.TestCase):
    def test_atomic_json_write_uses_same_directory_and_replace(self):
        from server_config import atomic_write_json

        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "config.json"
            with mock.patch("server_config.os.replace", wraps=__import__("os").replace) as replace:
                atomic_write_json(target, {"value": 1})

            source, destination = map(Path, replace.call_args.args)
            self.assertEqual(source.parent, target.parent)
            self.assertEqual(destination, target)
            self.assertEqual(json.loads(target.read_text()), {"value": 1})

    def test_repeated_saves_in_one_second_create_distinct_snapshots(self):
        from server_config import ConfigStorage

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            config = root / "config.json"
            snapshots = root / "snapshots"
            atomic = ConfigStorage(config, snapshots, timestamp=lambda: "20260713_120000")
            atomic.save({"value": 1})
            atomic.save({"value": 2})
            atomic.save({"value": 3})

            names = sorted(path.name for path in snapshots.glob("config_*.json"))
            self.assertEqual(names, [
                "config_20260713_120000.json",
                "config_20260713_120000_001.json",
            ])

    def test_restore_validates_before_using_atomic_write(self):
        from server_config import ConfigStorage

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            config = root / "config.json"
            snapshots = root / "snapshots"
            snapshots.mkdir()
            config.write_text('{"value": "current"}')
            (snapshots / "config_bad.json").write_text('{"invalid": true}')
            storage = ConfigStorage(config, snapshots)

            with mock.patch("server_config.atomic_write_json") as atomic:
                with self.assertRaisesRegex(ValueError, "invalid snapshot"):
                    storage.restore("bad", lambda data: (False, "invalid snapshot"))
                atomic.assert_not_called()

            self.assertEqual(json.loads(config.read_text()), {"value": "current"})


class TestSafeFileIdentifier(unittest.TestCase):
    def test_rejects_empty_traversal_and_encoded_separators(self):
        from server_files import safe_file_identifier

        for value in ("", ".", "..", "../note", r"..\note", "%2fetc", "%5Cetc"):
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    safe_file_identifier(value)

        self.assertEqual(safe_file_identifier("note_1-test"), "note_1-test")
        self.assertEqual(
            safe_file_identifier("icon.name.svg", allow_extension=True),
            "icon.name.svg",
        )


class TestFileBackedEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server_module = _import_server()

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        root = Path(self.temporary.name)
        self.original_here = self.server_module.HERE
        self.original_storage = self.server_module.CONFIG_STORAGE
        self.original_paths = (
            self.server_module.UPLOADS,
            self.server_module.ICONS,
            self.server_module.ICONS_DIR,
        )
        self.server_module.HERE = root
        self.server_module.CONFIG_STORAGE = self.server_module.ConfigStorage(
            root / "config.json", root / "snapshots"
        )
        self.server_module.UPLOADS = root / "uploads"
        self.server_module.ICONS = root / "icons"
        self.server_module.ICONS_DIR = root / "uploads" / "icons"
        for directory in (self.server_module.UPLOADS, self.server_module.ICONS, self.server_module.ICONS_DIR):
            directory.mkdir(parents=True, exist_ok=True)
        self.server_module.NOTES = root / "notes"
        self.server_module.NOTES.mkdir()
        self.httpd = self.server_module.http.server.ThreadingHTTPServer(
            ("127.0.0.1", 0), self.server_module.WarTabHandler
        )
        self.thread = threading.Thread(target=self.httpd.serve_forever)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.httpd.server_port}"

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join()
        self.server_module.HERE = self.original_here
        self.server_module.CONFIG_STORAGE = self.original_storage
        (
            self.server_module.UPLOADS,
            self.server_module.ICONS,
            self.server_module.ICONS_DIR,
        ) = self.original_paths
        self.temporary.cleanup()

    def request(self, path, *, data=None, method=None):
        request = urllib.request.Request(self.base_url + path, data=data, method=method)
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read())

    def test_note_get_and_post_apply_identical_identifier_validation(self):
        for path in ("/api/notes/", "/api/notes/..", "/api/notes/%2Fetc"):
            with self.subTest(method="GET", path=path):
                status, _ = self.request(path)
                self.assertEqual(status, 400)
            with self.subTest(method="POST", path=path):
                status, _ = self.request(path, data=b"content")
                self.assertEqual(status, 400)

        status, saved = self.request("/api/notes/note_1-test", data=b"content")
        self.assertEqual((status, saved), (200, {"status": "saved", "id": "note_1-test"}))
        status, loaded = self.request("/api/notes/note_1-test")
        self.assertEqual((status, loaded), (200, {"id": "note_1-test", "content": "content"}))

    def test_config_endpoint_uses_atomic_storage(self):
        from server_config import ConfigStorage

        root = Path(self.temporary.name)
        config_path = root / "config.json"
        self.server_module.CONFIG_STORAGE = ConfigStorage(
            config_path, root / "snapshots"
        )
        config = {
            "theme": {"bgType": "gradient", "bgValue": "#000", "glow": "#888"},
            "layout": {"cols": 4},
            "cards": [],
        }
        with mock.patch("server_config.os.replace", wraps=__import__("os").replace) as replace:
            status, response = self.request("/api/config", data=json.dumps(config).encode())

        self.assertEqual((status, response), (200, {"status": "saved"}))
        self.assertTrue(replace.called)
        self.assertEqual(json.loads(config_path.read_text()), config)

    def test_restore_rejects_invalid_config_and_preserves_current_file(self):
        root = Path(self.temporary.name)
        snapshots = root / "snapshots"
        snapshots.mkdir()
        current = {"current": True}
        (root / "config.json").write_text(json.dumps(current))
        (snapshots / "config_bad.json").write_text('{"invalid": true}')

        with mock.patch("server_config.os.replace", wraps=__import__("os").replace) as replace:
            status, response = self.request("/api/config/restore/bad", data=b"")

        self.assertEqual(status, 400)
        self.assertIn("invalid config", response["error"])
        self.assertFalse(replace.called)
        self.assertEqual(json.loads((root / "config.json").read_text()), current)

    def test_file_endpoints_reject_encoded_separator_identifiers(self):
        requests = (
            ("/api/upload/%2Fimage.png", None, "DELETE"),
            ("/api/icons/delete/%2Ficon.png", b"", None),
            ("/api/save-icon?name=%2Ficon", b"<svg/>", None),
            ("/api/config/delete-snapshot/%2Fsnapshot", b"", None),
        )
        for path, data, method in requests:
            with self.subTest(path=path):
                status, _ = self.request(path, data=data, method=method)
                self.assertEqual(status, 400)

    def test_note_body_limit_is_checked_before_writing(self):
        oversized = b"x" * (1024 * 1024 + 1)
        status, response = self.request("/api/notes/large", data=oversized)

        self.assertEqual(status, 413)
        self.assertEqual(response, {"error": "too large"})
        self.assertFalse((Path(self.temporary.name) / "notes" / "large.md").exists())


if __name__ == "__main__":
    unittest.main()
