"""Copy reviewed AI illustrated sprites into live game status folder."""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'client' / 'public' / 'characters' / 'status-illustrated' / 'modern'
DST = ROOT / 'client' / 'public' / 'characters' / 'status' / 'modern'


def apply(species: str | None = None, dry_run: bool = False) -> int:
    if not SRC.exists():
        print(f'Source not found: {SRC}')
        return 0
    count = 0
    species_dirs = [SRC / species] if species else sorted(p for p in SRC.iterdir() if p.is_dir())
    for sp_dir in species_dirs:
        if not sp_dir.exists():
            print(f'SKIP missing {sp_dir.name}')
            continue
        for png in sp_dir.rglob('*.png'):
            rel = png.relative_to(SRC)
            dest = DST / rel
            if dry_run:
                print(f'WOULD COPY {rel}')
            else:
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(png, dest)
            count += 1
    action = 'Would copy' if dry_run else 'Copied'
    print(f'{action} {count} files to {DST}')
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description='Apply illustrated status sprites to game assets')
    parser.add_argument('--species', help='Single species id (default: all)')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    apply(args.species, args.dry_run)


if __name__ == '__main__':
    main()
