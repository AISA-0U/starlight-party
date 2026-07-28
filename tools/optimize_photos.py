"""Generate responsive WebP assets and the runtime photo manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps, UnidentifiedImageError


LOGGER = logging.getLogger("photo-optimizer")
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--photos-dir", type=Path, default=Path("assets/photos"))
    parser.add_argument("--thumb-size", type=int, default=640)
    parser.add_argument("--full-size", type=int, default=1600)
    parser.add_argument("--thumb-quality", type=int, default=76)
    parser.add_argument("--full-quality", type=int, default=82)
    return parser.parse_args()


def validate_number(name: str, value: int, minimum: int, maximum: int) -> None:
    if not minimum <= value <= maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}, got {value}")


def load_source_config(path: Path) -> dict[str, Any]:
    try:
        config = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise FileNotFoundError(f"Photo source manifest not found: {path}") from error
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid JSON in {path}: {error}") from error

    photos = config.get("photos")
    if not isinstance(photos, list) or not all(isinstance(item, str) and item.strip() for item in photos):
        raise ValueError("photos must be an array of non-empty source filenames")
    if len(photos) != len(set(photos)):
        raise ValueError("photos contains duplicate filenames")

    special = config.get("specialPhoto", "")
    if not isinstance(special, str):
        raise ValueError("specialPhoto must be a filename string")
    messages = config.get("messages", [])
    if not isinstance(messages, list) or not all(isinstance(item, str) for item in messages):
        raise ValueError("messages must be an array of strings")
    return config


def ensure_source_path(photos_dir: Path, filename: str) -> Path:
    relative = Path(filename)
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError(f"Photo filename must stay inside {photos_dir}: {filename}")
    source = (photos_dir / relative).resolve()
    if photos_dir.resolve() not in source.parents:
        raise ValueError(f"Photo filename escapes {photos_dir}: {filename}")
    if source.suffix.lower() not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported image format: {filename}")
    if not source.is_file():
        raise FileNotFoundError(f"Photo file not found: {source}")
    return source


def output_name(filename: str, source: Path, settings: str) -> str:
    relative = Path(filename)
    digest = hashlib.sha256()
    digest.update(filename.encode("utf-8"))
    digest.update(settings.encode("ascii"))
    with source.open("rb") as source_file:
        for chunk in iter(lambda: source_file.read(1024 * 1024), b""):
            digest.update(chunk)
    fingerprint = digest.hexdigest()[:10]
    name = f"{relative.stem}.{fingerprint}.webp"
    return str(relative.with_name(name)).replace("\\", "/")


def save_variant(image: Image.Image, destination: Path, max_size: int, quality: int) -> None:
    variant = image.copy()
    variant.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    destination.parent.mkdir(parents=True, exist_ok=True)
    variant.save(destination, "WEBP", quality=quality, method=6, optimize=True)
    LOGGER.info(
        "generated %-5s %4dx%-4d %7.1f KB",
        destination.parent.name,
        variant.width,
        variant.height,
        destination.stat().st_size / 1024,
    )


def optimize_photo(
    photos_dir: Path,
    filename: str,
    thumb_size: int,
    full_size: int,
    thumb_quality: int,
    full_quality: int,
) -> dict[str, str]:
    source = ensure_source_path(photos_dir, filename)
    settings = f"{thumb_size}:{full_size}:{thumb_quality}:{full_quality}"
    relative_output = output_name(filename, source, settings)
    thumb_relative = Path("optimized/thumbs") / relative_output
    full_relative = Path("optimized/full") / relative_output

    try:
        with Image.open(source) as original:
            normalized = ImageOps.exif_transpose(original)
            if normalized.mode not in {"RGB", "RGBA"}:
                normalized = normalized.convert("RGBA" if "transparency" in normalized.info else "RGB")
            save_variant(normalized, photos_dir / thumb_relative, thumb_size, thumb_quality)
            save_variant(normalized, photos_dir / full_relative, full_size, full_quality)
    except (OSError, UnidentifiedImageError) as error:
        raise RuntimeError(f"Unable to process {source}: {error}") from error

    return {
        "thumb": str(thumb_relative).replace("\\", "/"),
        "full": str(full_relative).replace("\\", "/"),
    }


def main() -> int:
    args = parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    try:
        validate_number("thumb-size", args.thumb_size, 160, 1600)
        validate_number("full-size", args.full_size, args.thumb_size, 4096)
        validate_number("thumb-quality", args.thumb_quality, 30, 95)
        validate_number("full-quality", args.full_quality, 30, 95)

        photos_dir = args.photos_dir.resolve()
        config = load_source_config(photos_dir / "photos.source.json")
        source_filenames = list(config["photos"])
        special_filename = config.get("specialPhoto", "").strip()
        all_filenames = source_filenames + ([special_filename] if special_filename else [])

        optimized: dict[str, dict[str, str]] = {}
        for filename in all_filenames:
            LOGGER.info("processing %s", filename)
            optimized[filename] = optimize_photo(
                photos_dir,
                filename,
                args.thumb_size,
                args.full_size,
                args.thumb_quality,
                args.full_quality,
            )

        runtime_config = {
            "photos": [optimized[filename] for filename in source_filenames],
            "specialPhoto": optimized.get(special_filename),
            "specialMessage": config.get("specialMessage", ""),
            "messages": config.get("messages", []),
        }
        manifest_path = photos_dir / "photos.json"
        manifest_path.write_text(
            json.dumps(runtime_config, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        LOGGER.info("wrote runtime manifest %s", manifest_path)
        return 0
    except (OSError, RuntimeError, ValueError) as error:
        LOGGER.error("optimization failed: %s", error)
        return 1


if __name__ == "__main__":
    sys.exit(main())
