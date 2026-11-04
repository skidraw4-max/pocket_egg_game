#!/usr/bin/env python3
"""CDN PNG 배경을 1080x1920 webp로 변환해 client/public/wallpapers/ 에 저장."""
from __future__ import annotations

import io
import sys
from pathlib import Path

try:
    import requests
    from PIL import Image
except ImportError:
    print("pip install requests pillow 필요")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "client" / "public" / "wallpapers"
OUT.mkdir(parents=True, exist_ok=True)

SOURCES = {
    "wallpaper_forest": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/EDyFLiIKoVTNidnh.png",
    "wallpaper_ocean": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/fpjUTdQSftHkbLXj.png",
    "wallpaper_cloud": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/jQMljEkJnwaQEIjS.png",
    "wallpaper_candy": "https://files.manuscdn.com/user_upload_by_module/session_file/310519663342761074/vuxdWHKrUrCnFAUo.png",
}

TARGET_SIZE = (1080, 1920)
QUALITY = 82


def main() -> None:
    for name, url in SOURCES.items():
        out_path = OUT / f"{name}.webp"
        print(f"Downloading {name}...")
        resp = requests.get(url, timeout=120)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
        img = img.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
        img.save(out_path, "WEBP", quality=QUALITY, method=6)
        kb = out_path.stat().st_size / 1024
        print(f"  -> {out_path} ({kb:.0f} KB)")


if __name__ == "__main__":
    main()
