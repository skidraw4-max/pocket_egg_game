"""Analyze Android bundled public asset sizes."""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANDIDATES = [
    ROOT / "android" / "app" / "src" / "main" / "assets" / "public",
    ROOT / "client" / "public",
    ROOT / "dist" / "public",
]

root = next((p for p in CANDIDATES if p.exists()), None)
if not root:
    print("No public dir found")
    raise SystemExit(1)

by_ext: dict[str, list[int]] = defaultdict(lambda: [0, 0])
files: list[tuple[int, str]] = []
by_dir: dict[str, int] = defaultdict(int)

for p in root.rglob("*"):
    if not p.is_file():
        continue
    s = p.stat().st_size
    rel = str(p.relative_to(root)).replace("\\", "/")
    by_ext[p.suffix.lower()][0] += s
    by_ext[p.suffix.lower()][1] += 1
    files.append((s, rel))
    top = rel.split("/")[0] if "/" in rel else rel
    by_dir[top] += s

total = sum(s for s, _ in files)
print(f"ROOT: {root}")
print(f"Total: {len(files)} files, {total / 1024 / 1024:.1f} MB\n")

print("By extension:")
for ext, (sz, cnt) in sorted(by_ext.items(), key=lambda x: -x[1][0])[:15]:
    label = ext or "(none)"
    print(f"  {label:8} {cnt:5}  {sz / 1024 / 1024:8.1f} MB")

print("\nBy top-level folder:")
for name, sz in sorted(by_dir.items(), key=lambda x: -x[1])[:20]:
    print(f"  {name:30} {sz / 1024 / 1024:8.1f} MB")

print("\nTop 25 files:")
for s, rel in sorted(files, reverse=True)[:25]:
    print(f"  {s / 1024 / 1024:7.2f} MB  {rel}")
