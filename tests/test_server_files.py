"""Tests for WarTab file/image safety (server_files.py)."""

import tempfile
import unittest
from pathlib import Path
from unittest import mock

import server_files


def _tiny_png() -> bytes:
    import struct
    import zlib

    def chunk(tag: bytes, data: bytes) -> bytes:
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    raw = b"\x00" + bytes([100, 150, 200]) * 2 * 2
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", 2, 2, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


class TestMagicMatches(unittest.TestCase):
    def test_png_magic(self):
        self.assertTrue(server_files._magic_matches(_tiny_png(), ".png"))
        self.assertFalse(server_files._magic_matches(b"<html>not an image</html>", ".png"))

    def test_svg_magic(self):
        self.assertTrue(server_files._magic_matches(b"<svg xmlns='x'/>", ".svg"))
        self.assertTrue(server_files._magic_matches(b"<?xml version='1.0'?>", ".svg"))
        self.assertFalse(server_files._magic_matches(b"<script>alert(1)</script>", ".svg"))


class TestProcessImageWithoutPIL(unittest.TestCase):
    """When Pillow is absent, only content matching its declared extension is stored."""

    def setUp(self):
        self._pil = server_files.HAVE_PIL
        server_files.HAVE_PIL = False

    def tearDown(self):
        server_files.HAVE_PIL = self._pil

    def test_matching_magic_stored(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = server_files.process_image(
                _tiny_png(), "photo.png", tmp, max_bytes=2_000_000, max_width=8192, max_height=8192
            )
            self.assertIn("url", result)
            self.assertTrue((Path(tmp) / Path(result["url"]).name).exists())

    def test_mismatched_magic_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = server_files.process_image(
                b"<html>not an image</html>", "photo.png", tmp,
                max_bytes=2_000_000, max_width=8192, max_height=8192,
            )
            self.assertIn("error", result)
            self.assertEqual(list(Path(tmp).glob("*.png")), [])


class TestDecompressionBombRejected(unittest.TestCase):
    """A header-only image declaring huge dimensions must be rejected, not decoded."""

    @mock.patch.object(server_files, "HAVE_PIL", True)
    @mock.patch.object(server_files, "_image_too_large", return_value=True)
    def test_process_image_rejects_huge_dimensions(self, _too_large):
        with tempfile.TemporaryDirectory() as tmp:
            result = server_files.process_image(
                _tiny_png(), "photo.png", tmp,
                max_bytes=2_000_000, max_width=8192, max_height=8192,
            )
        self.assertEqual(result, {"error": "Image dimensions too large"})

    @mock.patch.object(server_files, "HAVE_PIL", True)
    @mock.patch.object(server_files, "_image_too_large", return_value=True)
    def test_process_icon_rejects_huge_dimensions(self, _too_large):
        with tempfile.TemporaryDirectory() as tmp:
            result = server_files.process_icon(_tiny_png(), tmp)
        self.assertEqual(result, {"error": "Image dimensions too large"})


if __name__ == "__main__":
    unittest.main()
