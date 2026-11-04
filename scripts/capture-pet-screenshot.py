"""Playwright: inject save state and capture pet display screenshot."""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent.parent / 'test-pet-screenshot.png'
TODAY = date.today().isoformat()

SAVE = {
    "pet": {
        "name": "포코",
        "stage": "child",
        "species": "번개몬",
        "level": 10,
        "exp": 0,
        "expToNext": 100,
        "intimacy": 50,
        "birthDate": 1700000000000,
        "traits": {"power": 10, "intelligence": 5, "charm": 5, "vitality": 5},
    },
    "status": {"hunger": 80, "mood": 70, "clean": 90, "fatigue": 95},
    "coins": 500,
    "gems": 10,
    "iapPurchases": {},
    "inventory": [],
    "room": {"wallpaper": "default", "furniture": []},
    "collection": ["번개몬"],
    "lastSaveTime": int(__import__('time').time() * 1000),
    "totalPlayDays": 5,
    "missions": {"missions": [], "lastResetDate": TODAY},
    "attendance": {
        "lastLoginDate": TODAY,
        "streak": 2,
        "totalDays": 2,
        "weeklyMissionsClaimed": True,
        "lastWeekStr": "2099-W01",
    },
    "claimedEvolutionRewards": [],
    "claimedCollectionRewards": [],
    "claimedIntimacyRewards": [],
    "unlockedEmotions": [],
    "friendCoins": 0,
    "nickname": "테스트",
    "tutorialSeen": {"main": True, "home": True, "care": True},
    "ownedWallpapers": [],
    "eggColor": "pink",
    "gachaEgg": None,
    "dailyChallenges": {"challenges": [], "lastResetDate": TODAY},
    "weeklyGoals": {"goals": [], "weekStr": "2099-W01", "claimed": []},
    "fragmentExchangeDaily": {},
}


def main() -> None:
    save_json = json.dumps(SAVE)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 430, "height": 932})
        page.add_init_script(
            f"localStorage.setItem('pocket_egg_save', {json.dumps(save_json)});"
        )
        page.goto("http://localhost:3000/", wait_until="networkidle")
        page.wait_for_timeout(3000)
        for label in ("알겠어요", "감사합니다"):
            btn = page.get_by_role("button", name=label)
            if btn.count():
                btn.first.click(force=True)
                page.wait_for_timeout(600)
        page.screenshot(path=str(OUT), full_page=False)
        browser.close()
    print(f"Saved {OUT}")


if __name__ == "__main__":
    main()
