"""Debug: dump home screen state for smoke test tuning."""
import json
from datetime import date
from playwright.sync_api import sync_playwright

TODAY = date.today().isoformat()
SAVE = {
    "version": 3,
    "pet": {
        "name": "포코",
        "species": "기본몬",
        "stage": "child",
        "level": 12,
        "exp": 30,
        "expToNext": 100,
        "intimacy": 55,
        "birthDate": 1700000000000,
        "traits": {"power": 10, "intelligence": 8, "charm": 8, "vitality": 8},
    },
    "status": {"hunger": 15, "mood": 10, "clean": 20, "fatigue": 95},
    "coins": 999,
    "gems": 5,
    "eggColor": "pink",
    "tutorialSeen": {"main": True, "home": True, "care": True},
    "missions": {"missions": [], "lastResetDate": TODAY},
    "attendance": {"lastLoginDate": TODAY, "streak": 1, "totalDays": 1, "weeklyMissionsClaimed": True, "lastWeekStr": "2099-W01"},
    "lastSaveTime": 1700000000000,
    "collection": ["기본몬"],
    "room": {"wallpaper": "default", "furniture": []},
    "inventory": [],
    "iapPurchases": {},
    "dailyChallenges": {"challenges": [], "lastResetDate": TODAY},
    "weeklyGoals": {"goals": [], "weekStr": "2099-W01", "claimed": []},
}

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 430, "height": 932})
    page.goto("http://localhost:3000/", wait_until="networkidle")
    page.evaluate(f"localStorage.setItem('pocket_egg_save', JSON.stringify({json.dumps(SAVE)}));")
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(800)
    if page.get_by_role("button", name="게임 시작하기").count():
        page.get_by_role("button", name="게임 시작하기").first.click(force=True)
    page.wait_for_timeout(3000)
    for label in ("알겠어요", "감사합니다"):
        b = page.get_by_role("button", name=label)
        if b.count():
            b.first.click(force=True)
            page.wait_for_timeout(500)

    imgs = page.evaluate("""() => Array.from(document.images).map(i => ({alt:i.alt, src:i.src.slice(-80), w:i.naturalWidth}))""")
    buttons = page.evaluate("""() => Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean).slice(0,30)""")
    body = page.locator("body").inner_text()[:800]
    print("IMAGES:", json.dumps(imgs[:8], ensure_ascii=False, indent=2))
    print("BUTTONS:", buttons)
    print("BODY:", body)
    page.screenshot(path=str(__import__("pathlib").Path(__file__).parent / "debug-home.png"))
    browser.close()
