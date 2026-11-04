from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from scan_ear_asymmetry import analyze

CHAR = Path(__file__).resolve().parents[1] / "client" / "public" / "characters"
for name in [
    "basicmon.png",
    "status/modern/basicmon/baby/fatigue_10.png",
    "status/modern/basicmon/baby/mood_30.png",
    "status/modern/magicmon/mood_10.png",
    "classic/basicmon.png",
]:
    p = CHAR / name.replace("/", "\\")
    r = analyze(p)
    print(name, f"ratio={r['ratio']:.3f}" if r else "N/A")

severe = sum(
    1
    for p in (CHAR / "status").rglob("*.png")
    if (r := analyze(p)) and r["ratio"] < 0.55
)
print("severe status remaining:", severe)
