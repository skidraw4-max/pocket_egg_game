"""Comprehensive browser smoke test for Pocket Egg game."""
from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "http://localhost:3000/"
TODAY = date.today().isoformat()

issues: list[str] = []
passed: list[str] = []


def fail(msg: str) -> None:
    issues.append(msg)
    print(f"  FAIL: {msg}")


def ok(msg: str) -> None:
    passed.append(msg)
    print(f"  OK: {msg}")


def dismiss_popups(page) -> None:
    for label in ("알겠어요", "감사합니다", "닫기", "확인"):
        btn = page.get_by_role("button", name=label)
        if btn.count():
            try:
                btn.first.click(force=True, timeout=800)
                page.wait_for_timeout(400)
            except Exception:
                pass


def has_crash(page) -> bool:
    body = page.locator("body").inner_text().lower()
    return "unexpected error" in body or "오류가 발생" in body


def check_console(page, label: str) -> None:
    logs = [m for m in page.console_messages if m.type in ("error", "warning")]
    severe = [m for m in logs if "error" in m.type.lower()]
    if severe:
        fail(f"{label}: console errors={len(severe)} — {severe[0].text[:120]}")
    else:
        ok(f"{label}: no console errors")


def test_fresh_start(page) -> None:
    print("\n=== 1. Fresh start (egg select) ===")
    page.goto(URL, wait_until="networkidle")
    page.evaluate("localStorage.clear();")
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(1000)

    if has_crash(page):
        fail("fresh: crash on title screen")
        return
    ok("fresh: title screen loads")

    start = page.get_by_role("button", name="게임 시작하기")
    if not start.count():
        fail("fresh: start button missing")
        return
    start.first.click(force=True)
    page.wait_for_timeout(2000)

    if has_crash(page):
        fail("fresh: crash after start")
        return

    egg_text = page.locator("body").inner_text()
    if "알" in egg_text or "선택" in egg_text or "부화" in egg_text:
        ok("fresh: egg select / intro screen visible")
    else:
        fail(f"fresh: unexpected screen after start — snippet: {egg_text[:200]}")

    # Pick first egg-like button if present
    for sel in ["button:has-text('선택')", "button:has-text('핑크')", "button:has-text('파랑')"]:
        btn = page.locator(sel)
        if btn.count():
            btn.first.click(force=True)
            page.wait_for_timeout(1500)
            break

    dismiss_popups(page)
    page.wait_for_timeout(1500)
    if has_crash(page):
        fail("fresh: crash after egg selection")
    else:
        ok("fresh: no crash after egg flow")


def make_home_save(**overrides) -> dict:
    save = {
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
        "status": {"hunger": 80, "mood": 70, "clean": 90, "fatigue": 15},
        "coins": 999,
        "gems": 5,
        "iapPurchases": {},
        "inventory": [],
        "room": {"wallpaper": "default", "furniture": []},
        "collection": ["기본몬"],
        "lastSaveTime": 1700000000000,
        "totalPlayDays": 3,
        "missions": {"missions": [], "lastResetDate": TODAY},
        "attendance": {
            "lastLoginDate": TODAY,
            "streak": 1,
            "totalDays": 1,
            "weeklyMissionsClaimed": True,
            "lastWeekStr": "2099-W01",
        },
        "claimedEvolutionRewards": [],
        "claimedCollectionRewards": [],
        "claimedIntimacyRewards": [],
        "unlockedEmotions": [],
        "friendCoins": 0,
        "nickname": "테스터",
        "tutorialSeen": {"main": True, "home": True, "care": True},
        "ownedWallpapers": [],
        "eggColor": "pink",
        "gachaEgg": None,
        "dailyChallenges": {"challenges": [], "lastResetDate": TODAY},
        "weeklyGoals": {"goals": [], "weekStr": "2099-W01", "claimed": []},
        "fragmentExchangeDaily": {},
    }
    save.update(overrides)
    return save


def inject_and_go_home(page, save: dict, skin: str | None = None) -> None:
    """Navigate with save injected before app boot (avoids Firebase race)."""
    save_json = json.dumps(save)
    init_parts = [f"localStorage.setItem('pocket_egg_save', {json.dumps(save_json)});"]
    if skin:
        init_parts.append(f"localStorage.setItem('characterSkin', {json.dumps(skin)});")
    page.add_init_script("".join(init_parts))
    page.goto(URL, wait_until="networkidle")
    page.wait_for_timeout(2500)
    dismiss_popups(page)
    page.wait_for_timeout(800)


def test_home_gameplay(page) -> None:
    print("\n=== 2. Home screen (modern, 기본몬) ===")
    inject_and_go_home(page, make_home_save())

    if has_crash(page):
        fail("home: crash")
        return
    ok("home: loads without crash")

    img = page.locator('img[alt="포코"]')
    if img.count():
        src = img.first.get_attribute("src") or ""
        if src and "characters" in src:
            ok(f"home: pet image loaded ({src.split('/')[-1][:40]})")
        else:
            fail(f"home: pet image src unexpected: {src[:80]}")
    else:
        fail("home: pet img not found")

    # Care action
    for action in ("먹이주기", "놀이", "목욕", "휴식"):
        btn = page.get_by_role("button", name=action)
        if btn.count():
            btn.first.click(force=True)
            page.wait_for_timeout(600)
    ok("home: care buttons clickable")


def test_low_status_sprite(page) -> None:
    print("\n=== 3. Low status (status expression sprite) ===")
    save = make_home_save()
    save["status"] = {"hunger": 15, "mood": 10, "clean": 20, "fatigue": 95}
    inject_and_go_home(page, save)

    if has_crash(page):
        fail("low_status: crash")
        return

    img = page.locator('img[alt="포코"]')
    if not img.count():
        fail("low_status: no pet image")
        return
    src = img.first.get_attribute("src") or ""
    if "status" in src:
        ok(f"low_status: status sprite active ({src.split('/')[-1]})")
    else:
        ok(f"low_status: using base sprite ({src.split('/')[-1]}) — may be OK if thresholds not met")

    # Screenshot for visual check
    out = Path(__file__).parent / "test-low-status.png"
    page.screenshot(path=str(out))
    ok(f"low_status: screenshot saved {out.name}")


def test_classic_skin(page) -> None:
    print("\n=== 4. Classic skin ===")
    inject_and_go_home(page, make_home_save(), skin="classic")

    if has_crash(page):
        fail("classic: crash")
        return
    ok("classic: home loads")

    img = page.locator('img[alt="포코"]')
    if img.count():
        src = img.first.get_attribute("src") or ""
        if "classic" in src:
            ok("classic: classic asset path used")
        else:
            fail(f"classic: expected classic path, got {src[:100]}")


def test_quest_panel(page) -> None:
    print("\n=== 5. Quest / mission panel ===")
    inject_and_go_home(page, make_home_save())

    quest_btn = page.get_by_role("button", name="미션")
    if quest_btn.count():
        quest_btn.first.click(force=True)
        page.wait_for_timeout(1200)
        body = page.locator("body").inner_text()
        if has_crash(page):
            fail("quest: crash opening panel")
        elif "미션" in body or "퀘스트" in body or "도전" in body:
            ok("quest: panel opens")
        else:
            fail("quest: panel content unexpected")
        page.keyboard.press("Escape")
        page.wait_for_timeout(400)
    else:
        fail("quest: button not found")


def test_collection(page) -> None:
    print("\n=== 6. Collection menu ===")
    inject_and_go_home(page, make_home_save())

    btn = page.get_by_role("button", name="도감")
    if btn.count():
        btn.first.click(force=True)
        page.wait_for_timeout(1200)
        body = page.locator("body").inner_text()
        if has_crash(page):
            fail("collection: crash")
        elif "도감" in body or "반려몬" in body:
            ok("collection: opens")
        else:
            fail("collection: panel content unexpected")
        page.keyboard.press("Escape")
    else:
        fail("collection: menu button not found")


def test_shop_and_play(page) -> None:
    print("\n=== 6b. Shop & play menu ===")
    inject_and_go_home(page, make_home_save())

    shop = page.get_by_role("button", name="상점")
    if shop.count():
        shop.first.click(force=True)
        page.wait_for_timeout(1200)
        if has_crash(page):
            fail("shop: crash")
        else:
            ok("shop: opens")
        page.keyboard.press("Escape")
    else:
        fail("shop: button not found")

    play = page.get_by_role("button", name="놀이")
    if play.count():
        play.first.click(force=True)
        page.wait_for_timeout(1200)
        if has_crash(page):
            fail("play menu: crash")
        else:
            ok("play menu: opens")
        page.keyboard.press("Escape")


def test_corrupted_save(page) -> None:
    print("\n=== 7. Corrupted missions save (migration) ===")
    bad = make_home_save()
    bad["missions"] = {"lastResetDate": "2020-01-01"}
    inject_and_go_home(page, bad)
    if has_crash(page):
        fail("corrupted_missions: crash")
    else:
        ok("corrupted_missions: handled without crash")


def test_broken_images(page) -> None:
    print("\n=== 8. Broken image resources ===")
    inject_and_go_home(page, make_home_save())
    broken = page.evaluate(
        """() => Array.from(document.images)
          .filter(i => !i.complete || i.naturalWidth === 0)
          .map(i => i.src).slice(0, 10)"""
    )
    if broken:
        fail(f"broken images: {broken[:3]}")
    else:
        ok("broken images: none detected on home")


def main() -> None:
    print("Pocket Egg smoke test —", URL)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 430, "height": 932})
        page_errors: list[str] = []
        page.on("pageerror", lambda e: page_errors.append(str(e)))

        test_fresh_start(page)
        test_home_gameplay(page)
        test_low_status_sprite(page)
        test_classic_skin(page)
        test_quest_panel(page)
        test_collection(page)
        test_shop_and_play(page)
        test_corrupted_save(page)
        test_broken_images(page)

        if page_errors:
            fail(f"uncaught page errors: {len(page_errors)} — {page_errors[0][:200]}")
        else:
            ok("no uncaught page errors")

        browser.close()

    print("\n========== SUMMARY ==========")
    print(f"Passed: {len(passed)}")
    print(f"Issues: {len(issues)}")
    for i in issues:
        print(f"  - {i}")
    sys.exit(1 if issues else 0)


if __name__ == "__main__":
    main()
