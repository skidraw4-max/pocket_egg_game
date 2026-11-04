"""Test corrupted missions save triggering processAttendance crash."""
from __future__ import annotations

import json
from playwright.sync_api import sync_playwright

URL = "http://localhost:3000/"

# missions object without missions array
BAD_SAVE = {
    "version": 3,
    "coins": 550,
    "gems": 10,
    "eggColor": None,
    "gachaEgg": None,
    "pet": {
        "name": "포코",
        "species": "신비로운 알",
        "stage": "egg",
        "level": 1,
        "exp": 0,
        "expToNext": 100,
        "intimacy": 10,
        "traits": {"power": 10, "intelligence": 10, "charm": 10, "vitality": 10},
    },
    "status": {"hunger": 80, "mood": 70, "clean": 90, "fatigue": 10},
    "missions": {"lastResetDate": "2020-01-01"},
    "attendance": {"lastLoginDate": "", "streak": 0, "totalDays": 0, "weeklyMissionsClaimed": False, "lastWeekStr": ""},
    "lastSaveTime": 1,
}


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 430, "height": 932})
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.goto(URL, wait_until="networkidle")
        page.evaluate(f"localStorage.setItem('pocket_egg_save', JSON.stringify({json.dumps(BAD_SAVE)}))")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(3000)
        body = page.locator("body").inner_text()
        print("immediate error:", "unexpected error" in body.lower())
        if errs:
            print("ERR:", errs[0][:500])
        if "unexpected error" in body.lower():
            print(page.locator("pre").first.inner_text()[:2000])
        page.get_by_role("button", name="게임 시작하기").first.click(force=True)
        page.wait_for_timeout(5000)
        body = page.locator("body").inner_text()
        print("after start error:", "unexpected error" in body.lower())
        if errs:
            for e in errs:
                print("ERR:", e[:500])
        browser.close()


if __name__ == "__main__":
    main()
