"""HTTP routing characterization tests for WarTab."""

import json
import os
import socket
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest import mock

import server


class TestServerRouting(unittest.TestCase):
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

    def request(self, path, *, data=None, method=None):
        request = urllib.request.Request(self.base_url + path, data=data, method=method)
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, response.headers, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.headers, error.read()

    def raw_request(self, request_bytes):
        host, port = self.httpd.server_address[:2]
        with socket.create_connection((str(host), port), timeout=2) as client:
            client.sendall(request_bytes)
            client.shutdown(socket.SHUT_WR)
            response = bytearray()
            while True:
                chunk = client.recv(65536)
                if not chunk:
                    break
                response.extend(chunk)
        head, body = bytes(response).split(b"\r\n\r\n", 1)
        status = int(head.split(b"\r\n", 1)[0].split()[1])
        return status, json.loads(body)

    def raw_status_and_body(self, request_bytes):
        host, port = self.httpd.server_address[:2]
        with socket.create_connection((str(host), port), timeout=2) as client:
            client.sendall(request_bytes)
            client.shutdown(socket.SHUT_WR)
            response = bytearray()
            while True:
                chunk = client.recv(65536)
                if not chunk:
                    break
                response.extend(chunk)
        head, body = bytes(response).split(b"\r\n\r\n", 1)
        status = int(head.split(b"\r\n", 1)[0].split()[1])
        return status, body

    def test_unknown_api_get_is_json_404_not_spa_html(self):
        status, headers, body = self.request("/api/not-a-route")
        self.assertEqual(status, 404)
        self.assertEqual(headers.get_content_type(), "application/json")
        self.assertEqual(json.loads(body), {"error": "not_found"})

    def test_unknown_delete_route_cannot_delete_an_upload(self):
        victim = server.UPLOADS / "victim.png"
        victim.write_bytes(b"image")

        status, headers, body = self.request("/api/not-upload/victim.png", method="DELETE")

        self.assertEqual(status, 404)
        self.assertEqual(headers.get_content_type(), "application/json")
        self.assertEqual(json.loads(body), {"error": "not_found"})
        self.assertTrue(victim.exists())

    def test_delete_upload_via_plural_frontend_path(self):
        """The frontend deleteFile() sends DELETE /api/uploads/<name> (plural);
        it must delete the file, not 404."""
        server.UPLOADS.mkdir(exist_ok=True)
        victim = server.UPLOADS / "victim.png"
        victim.write_bytes(b"image")

        status, headers, _ = self.request("/api/uploads/victim.png", method="DELETE")

        self.assertEqual(status, 200)
        self.assertFalse(victim.exists())

    def test_delete_upload_via_singular_path(self):
        server.UPLOADS.mkdir(exist_ok=True)
        victim = server.UPLOADS / "victim.png"
        victim.write_bytes(b"image")

        status, _, _ = self.request("/api/upload/victim.png", method="DELETE")

        self.assertEqual(status, 200)
        self.assertFalse(victim.exists())

    def test_encoded_traversal_cannot_bypass_static_blocklist(self):
        """A path that normalize-collapses onto a blocked target (literal or
        %2e%2e dots) must 404, not leak source/secrets."""
        secrets = {
            "server.py": b"SECRET SOURCE",
            "config.json": b'{"token": "leak-me"}',
            "data/.update_token": b"update-token-secret",
            "snapshots/config_x.json": b"{}",
        }
        for relative, content in secrets.items():
            path = self.root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)

        for route in (
            "/static/%2e%2e/server.py",
            "/static/../server.py",
            "/%2e%2e/config.json",
            "/x/%2e%2e%2fconfig.json",
            "/static/%2e%2e/data/.update_token",
            "/static/%2e%2e/snapshots/config_x.json",
        ):
            with self.subTest(route=route):
                status, _, body = self.request(route)
                self.assertEqual(status, 404)
                for secret in secrets.values():
                    self.assertNotIn(secret, body)

    def test_relative_request_target_cannot_bypass_static_blocklist(self):
        """A bare relative target (`GET config.json`) has no leading slash, so
        the leading-slash blocklist would skip it and translate_path would
        resolve it against the served root — leaking config.json. It must 404."""
        secret = b'{"token": "leak-me"}'
        (self.root / "config.json").write_bytes(secret)
        # translate_path resolves relative to the process cwd; point it at the
        # served root so the relative target maps to the private file.
        cwd = os.getcwd()
        os.chdir(self.root)
        try:
            status, body = self.raw_status_and_body(
                b"GET config.json HTTP/1.1\r\nHost: localhost\r\n"
                b"Connection: close\r\n\r\n"
            )
        finally:
            os.chdir(cwd)

        self.assertEqual(status, 404)
        self.assertNotIn(secret, body)

    def test_spa_fallback_remains_last_and_keeps_security_headers(self):
        status, headers, body = self.request("/dashboard/page")
        self.assertEqual(status, 200)
        self.assertEqual(body, b"<html>WarTab</html>")
        # Same-origin policy: no wildcard ACAO. A cross-site request (no
        # matching Origin) must NOT receive an Access-Control-Allow-Origin
        # header, otherwise any LAN webpage could read/write the API.
        self.assertNotIn("Access-Control-Allow-Origin", headers)
        self.assertIn("default-src 'self'", headers["Content-Security-Policy"])

    @mock.patch("server.handle_ping", return_value=({"host": "lan", "alive": True}, 200))
    def test_get_network_route_dispatches_once(self, ping):
        status, _, body = self.request("/api/ping?host=lan")
        self.assertEqual((status, json.loads(body)), (200, {"host": "lan", "alive": True}))
        ping.assert_called_once_with({"host": "lan"})

    @mock.patch("server.handle_proxy", return_value=({"status": 204, "body": ""}, 200))
    def test_post_network_route_dispatches_once(self, proxy):
        payload = {"url": "https://example.com"}
        status, _, body = self.request("/api/proxy", data=json.dumps(payload).encode())
        self.assertEqual((status, json.loads(body)), (200, {"status": 204, "body": ""}))
        proxy.assert_called_once_with(payload)

    def test_malformed_and_negative_content_lengths_are_rejected(self):
        for value in ("nope", "-1"):
            with self.subTest(value=value):
                status, body = self.raw_request(
                    b"POST /api/proxy HTTP/1.1\r\nHost: localhost\r\nContent-Length: "
                    + value.encode() + b"\r\nConnection: close\r\n\r\n"
                )
                self.assertEqual(status, 400)
                self.assertEqual(body, {"error": "invalid content length"})

    def test_proxy_request_body_is_bounded_before_reading(self):
        status, body = self.raw_request(
            b"POST /api/proxy HTTP/1.1\r\nHost: localhost\r\nContent-Length: 1048577\r\n"
            b"Connection: close\r\n\r\n"
        )
        self.assertEqual(status, 413)
        self.assertEqual(body, {"error": "too large"})


if __name__ == "__main__":
    unittest.main()
