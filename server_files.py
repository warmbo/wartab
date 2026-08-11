"""Safe file and image operations for WarTab file-backed endpoints."""

import io
import logging
import re
import urllib.parse
import uuid
from pathlib import Path

log = logging.getLogger("wartab")

try:
    from PIL import Image, ImageOps
    HAVE_PIL = True
except ImportError:
    HAVE_PIL = False

_IDENTIFIER = re.compile(r"[A-Za-z0-9_-]+\Z")
_FILENAME = re.compile(r"[A-Za-z0-9_.-]+\Z")
IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg")

# Pixel budget for decoded raster images. A header-only "decompression bomb" can
# declare dimensions far larger than its compressed size; we reject anything
# above this before decode to avoid OOM. (~40 MP is ~160MB as RGBA.)
MAX_DECODED_PIXELS = 40_000_000


def _image_too_large(image) -> bool:
    try:
        return (image.width or 0) * (image.height or 0) > MAX_DECODED_PIXELS
    except (ValueError, AttributeError):
        return True


# Magic-byte sniffers for the no-PIL path (P2-7): reject content whose declared
# extension does not match its actual bytes, so arbitrary files can't be stored
# and served under a safe-looking image extension.
_MAGIC = {
    ".png": b"\x89PNG",
    ".jpg": b"\xff\xd8",
    ".jpeg": b"\xff\xd8",
    ".gif": b"GIF8",
    ".webp": b"RIFF",  # ...WEBP; RIFF check is cheap, robust enough
}
_SVG_PREFIXES = (b"<svg", b"<?xml", b"<!DOCTYPE svg")


def _magic_matches(raw_bytes: bytes, extension: str) -> bool:
    if not raw_bytes:
        return False
    if extension == ".svg":
        stripped = raw_bytes.lstrip()[:512].lower()
        return any(stripped.startswith(p) for p in _SVG_PREFIXES)
    expected = _MAGIC.get(extension)
    if expected is None:
        return False
    return raw_bytes[: len(expected)].lower() == expected.lower()


def safe_file_identifier(value: str, *, allow_extension: bool = False) -> str:
    """Return a decoded safe identifier, or raise ``ValueError``."""
    if not isinstance(value, str) or not value:
        raise ValueError("invalid identifier")
    decoded = urllib.parse.unquote(value)
    if not decoded or "/" in decoded or "\\" in decoded:
        raise ValueError("invalid identifier")
    pattern = _FILENAME if allow_extension else _IDENTIFIER
    if decoded in (".", "..") or not pattern.fullmatch(decoded):
        raise ValueError("invalid identifier")
    return decoded


def process_image(raw_bytes, filename, uploads, *, max_bytes, max_width, max_height):
    if not raw_bytes:
        return {"error": "Empty file"}
    if len(raw_bytes) > max_bytes:
        return {"error": f"File too large ({len(raw_bytes)//1024}KB, max {max_bytes//1024}KB)"}
    extension = Path(filename).suffix.lower()
    image_format, output_extension = "JPEG", ".jpg"
    if extension == ".png":
        image_format, output_extension = "PNG", ".png"
    elif extension == ".webp":
        image_format, output_extension = "WEBP", ".webp"
    elif extension == ".gif":
        image_format, output_extension = "GIF", ".gif"
    output_name = f"{uuid.uuid4().hex}{output_extension}"
    output_path = Path(uploads) / output_name
    if not HAVE_PIL:
        # P2-7: without Pillow we can't re-encode, so only accept content whose
        # magic bytes match the declared extension (prevents storing arbitrary
        # bytes under a safe-looking image name).
        if not _magic_matches(raw_bytes, extension):
            return {"error": "File content does not match its image type"}
        output_path.write_bytes(raw_bytes)
        return {"url": f"/uploads/{output_name}", "path": str(output_path),
                "size": len(raw_bytes), "name": filename}
    try:
        image = Image.open(io.BytesIO(raw_bytes))
        # P2-8: reject decompression bombs BEFORE decode (thumbnail decodes).
        if _image_too_large(image):
            return {"error": "Image dimensions too large"}
        if image_format == "JPEG" and image.mode in ("RGBA", "P", "LA"):
            image = image.convert("RGB")
        if image.width > max_width or image.height > max_height:
            image.thumbnail((max_width, max_height), Image.LANCZOS)
        try:
            image = ImageOps.exif_transpose(image) or image
        except Exception as error:
            log.debug("exif_transpose failed: %s", error)
        options = {"format": image_format}
        if image_format == "JPEG":
            options.update(quality=80, optimize=True)
        elif image_format == "PNG":
            options["optimize"] = True
        elif image_format == "WEBP":
            options["quality"] = 85
        image.save(output_path, **options)
        return {"url": f"/uploads/{output_name}", "path": str(output_path),
                "size": output_path.stat().st_size, "name": filename,
                "width": image.width, "height": image.height}
    except Exception as error:
        return {"error": str(error)}


def process_icon(raw_bytes, icons_dir):
    if not raw_bytes:
        return {"error": "Empty file"}
    if len(raw_bytes) > 2 * 1024 * 1024:
        return {"error": "File too large"}
    if not HAVE_PIL:
        return {"error": "Pillow is required"}
    try:
        image = Image.open(io.BytesIO(raw_bytes))
        # P2-8: reject decompression bombs before decode.
        if _image_too_large(image):
            return {"error": "Image dimensions too large"}
        image = image.convert("RGBA" if image.mode in ("RGBA", "P", "LA") else "RGB")
        image.thumbnail((48, 48), Image.LANCZOS)
        output_name = f"{uuid.uuid4().hex}.png"
        output_path = Path(icons_dir) / output_name
        image.save(output_path, format="PNG", optimize=True)
        return {"url": f"/uploads/icons/{output_name}", "size": output_path.stat().st_size}
    except Exception as error:
        return {"error": str(error)}


def list_images(directory, url_prefix):
    files = []
    for path in sorted(Path(directory).iterdir(), key=lambda item: item.stat().st_mtime, reverse=True):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            files.append({"name": path.name, "url": f"{url_prefix}/{path.name}",
                          "size": path.stat().st_size, "mtime": path.stat().st_mtime})
    return files
