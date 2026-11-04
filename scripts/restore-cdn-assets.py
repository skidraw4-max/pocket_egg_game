#!/usr/bin/env python3
"""CDN legacy asset recovery — verify, package, Firebase Hosting mirror."""
from __future__ import annotations

import json
import shutil
import sys
import urllib.error
import urllib.request
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print('pip install pillow 필요')
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'client' / 'public'
MANIFEST_PATH = Path(__file__).resolve().parent / 'cdn-legacy-manifest.json'
PACKAGE_DIR = ROOT / 'scripts' / 'cdn-reupload-package'
MIRROR_DIR = PUBLIC / 'legacy-cdn' / 'session_file' / '310519663342761074'
CF_MIRROR_DIR = PUBLIC / 'legacy-cdn' / 'cloudfront' / 'daLuxDLrpRKKbPdxD8Red2'
REPORT_PATH = ROOT / 'scripts' / 'cdn-recovery-report.json'


def load_manifest() -> dict:
    return json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))


def resolve_source(rel: str, fallback: str | None = None) -> Path | None:
    primary = PUBLIC / rel
    if primary.exists():
        return primary
    if fallback:
        fb = PUBLIC / fallback
        if fb.exists():
            return fb
    return None


def write_converted(src: Path, dest: Path, mode: str) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if mode == 'copy':
        shutil.copy2(src, dest)
        return
    img = Image.open(src)
    if mode == 'webp_to_png':
        img.convert('RGBA').save(dest, 'PNG', optimize=True)
    elif mode == 'png_to_webp':
        img.convert('RGBA').save(dest, 'WEBP', quality=88, method=6)
    elif mode == 'copy_webp':
        shutil.copy2(src, dest)
    else:
        shutil.copy2(src, dest)


def copy_to_package(session: str, hash_name: str, src_file: Path) -> Path:
    dest = PACKAGE_DIR / 'user_upload_by_module' / 'session_file' / session / hash_name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src_file, dest)
    return dest


def build_assets(manifest: dict) -> list[dict]:
    built: list[dict] = []
    session = manifest['sessionId']

    def process_manus(hash_name: str, meta: dict, category: str) -> None:
        src = resolve_source(meta['source'], meta.get('fallback'))
        if not src:
            built.append({'category': category, 'hash': hash_name, 'error': 'missing source', 'meta': meta})
            return
        mode = meta.get('convert', 'copy')
        mirror_path = MIRROR_DIR / hash_name
        write_converted(src, mirror_path, mode)
        copy_to_package(session, hash_name, mirror_path)
        built.append({
            'category': category,
            'hash': hash_name,
            'cdnUrl': f"{manifest['manuscdnBase']}/{hash_name}",
            'mirrorUrl': f"{manifest['firebaseMirrorBase']}/{hash_name}",
            'source': str(src.relative_to(PUBLIC)),
            'bytes': mirror_path.stat().st_size,
        })

    for hash_name, meta in manifest['characters'].items():
        process_manus(hash_name, meta, 'character')

    for hash_name, meta in manifest['wallpapersPng'].items():
        process_manus(hash_name, meta, 'wallpaper')

    for hash_name, meta in manifest['titleAssets'].items():
        process_manus(hash_name, meta, 'title')

    cf_base = manifest['cloudfrontBase']
    for hash_name, meta in manifest['cloudfront'].items():
        src = resolve_source(meta['source'])
        if not src:
            built.append({'category': 'cloudfront', 'hash': hash_name, 'error': 'missing source', 'meta': meta})
            continue
        dest = CF_MIRROR_DIR / hash_name
        write_converted(src, dest, meta.get('convert', 'copy_webp'))
        cf_package = PACKAGE_DIR / 'cloudfront' / 'daLuxDLrpRKKbPdxD8Red2' / hash_name
        cf_package.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(dest, cf_package)
        built.append({
            'category': 'cloudfront',
            'hash': hash_name,
            'cdnUrl': f"{cf_base}/{hash_name}",
            'mirrorUrl': f"https://pocket-egg.web.app/legacy-cdn/cloudfront/daLuxDLrpRKKbPdxD8Red2/{hash_name}",
            'source': str(src.relative_to(PUBLIC)),
            'bytes': dest.stat().st_size,
        })

    return built


def check_url(url: str) -> dict:
    req = urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'PocketEgg-CDN-Recovery/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return {'url': url, 'ok': True, 'status': resp.status, 'length': resp.headers.get('Content-Length')}
    except urllib.error.HTTPError as e:
        return {'url': url, 'ok': False, 'status': e.code, 'error': str(e)}
    except Exception as e:
        return {'url': url, 'ok': False, 'status': None, 'error': str(e)}


def verify_cdn(manifest: dict) -> list[dict]:
    urls: list[str] = []
    for h in manifest['characters']:
        urls.append(f"{manifest['manuscdnBase']}/{h}")
    for h in manifest['wallpapersPng']:
        urls.append(f"{manifest['manuscdnBase']}/{h}")
    for h in manifest['titleAssets']:
        urls.append(f"{manifest['manuscdnBase']}/{h}")
    for h in manifest['cloudfront']:
        urls.append(f"{manifest['cloudfrontBase']}/{h}")
    return [check_url(u) for u in urls]


def main() -> None:
    manifest = load_manifest()
    print('=== CDN 상태 확인 ===')
    checks = verify_cdn(manifest)
    down = [c for c in checks if not c.get('ok')]
    print(f'전체 {len(checks)}개 중 {len(down)}개 접근 불가')

    print('\n=== 로컬 미러·재업로드 패키지 생성 ===')
    for d in (MIRROR_DIR, CF_MIRROR_DIR, PACKAGE_DIR):
        if d.exists():
            shutil.rmtree(d)

    built = build_assets(manifest)
    ok = [b for b in built if 'error' not in b]
    bad = [b for b in built if 'error' in b]
    print(f'생성 성공 {len(ok)}개, 소스 없음 {len(bad)}개')

    report = {
        'checks': checks,
        'built': built,
        'packageDir': str(PACKAGE_DIR),
        'mirrorDir': str(MIRROR_DIR),
        'cloudfrontMirrorDir': str(CF_MIRROR_DIR),
        'nextSteps': [
            'Manus Task Data Restoration Tool로 백업 복원 (동일 CDN URL 복구)',
            'firebase deploy --only hosting:game 으로 legacy-cdn 미러 배포',
            '복원 불가 시 Play Console 새 AAB 업로드',
        ],
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'리포트: {REPORT_PATH}')
    print(f'패키지: {PACKAGE_DIR}')


if __name__ == '__main__':
    main()
