"""Try multiple save states to reproduce egg-select crash."""
from __future__ import annotations

import json
from playwright.sync_api import sync_playwright

URL = "http://localhost:3000/"

BASE_SAVE = {
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
        "intimacy": 10,
        "traits": {"power": 10, "intelligence": 10, "charm": 10, "vitality": 10},
    },
    "status": {"hunger": 80, "mood": 70, "clean": 90, "fatigue": 10},
    "lastSaveTime": 1,
}


def run_case(name: str, setup_js: str) -> None:
    errors: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 430, "height": 932})
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.goto(URL, wait_until="networkidle")
        page.evaluate(setup_js)
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(800)
        start = page.get_by_role("button", name="게임 시작하기")
        if start.count():
            start.first.click(force=True)
        page.wait_for_timeout(4000)
        body = page.locator("body").inner_text()
        has_error = "unexpected error" in body.lower()
        pre = ""
        if has_error and page.locator("pre").count():
            pre = page.locator("pre").first.inner_text()[:500]
        print(f"[{name}] error={has_error} pageErrors={len(errors)}")
        if errors:
            print("  pageerror:", errors[0][:300])
        if pre:
            print("  stack:", pre[:300])
        browser.close()


def main() -> None:
    fresh = "localStorage.removeItem('pocket_egg_save'); localStorage.removeItem('characterSkin');"
    partial = f"localStorage.setItem('pocket_egg_save', JSON.stringify({json.dumps(BASE_SAVE)}));"
    bad_pet = partial.replace('"pet": {', '"pet": null, "xpet": {')
    classic = partial + "localStorage.setItem('characterSkin', 'classic');"
    egg_set = partial.replace('"eggColor": null', '"eggColor": "red"')

    run_case("fresh", fresh)
    run_case("partial_save_no_egg", partial)
    run_case("bad_pet_null", bad_pet)
    run_case("classic_skin", classic)
    run_case("egg_already_set", egg_set)


if __name__ == "__main__":
    main()
