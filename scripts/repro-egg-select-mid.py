"""Capture errors during egg select screen only (Home still mounted underneath)."""
from __future__ import annotations

from playwright.sync_api import sync_playwright

URL = "http://localhost:3000/"


def main() -> None:
    errors: list[str] = []
    logs: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 430, "height": 932})

        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: errors.append(str(err)))

        page.goto(URL, wait_until="networkidle")
        page.evaluate("localStorage.removeItem('pocket_egg_save')")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(1200)

        start = page.get_by_role("button", name="게임 시작하기")
        start.first.click(force=True)

        # Wait during spin + reveal
        for sec in [1, 2, 3, 4, 5]:
            page.wait_for_timeout(1000)
            body = page.locator("body").inner_text()
            has_error = "unexpected error" in body.lower()
            egg_visible = "알을 뽑는" in body or "알이 결정" in body or "당신의 알" in body
            print(f"t+{sec}s error={has_error} egg_ui={egg_visible}")
            if has_error:
                pre = page.locator("pre").first
                if pre.count():
                    print("STACK:", pre.inner_text()[:4000])
                break

        print("\n=== PAGE ERRORS ===")
        for e in errors:
            print(e)

        print("\n=== CONSOLE errors ===")
        for line in logs:
            if "[error]" in line.lower():
                print(line)

        page.screenshot(path="../test-egg-select-mid.png", full_page=True)
        browser.close()


if __name__ == "__main__":
    main()
