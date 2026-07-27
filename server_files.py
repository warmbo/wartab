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
        output_path.write_bytes(raw_bytes)
        return {"url": f"/uploads/{output_name}", "path": str(output_path),
                "size": len(raw_bytes), "name": filename}
    try:
        image = Image.open(io.BytesIO(raw_bytes))
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
