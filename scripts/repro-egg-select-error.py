"""Reproduce egg select flow and capture console/page errors."""
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
        page.wait_for_timeout(1500)

        start = page.get_by_role("button", name="게임 시작하기")
        if start.count():
            start.first.click(force=True)
            page.wait_for_timeout(500)

        page.wait_for_timeout(6000)  # spin completes

        confirm = page.locator("button", has_text="이 알로 시작하기")
        if confirm.count():
            confirm.first.click(force=True)
            page.wait_for_timeout(3000)

        body = page.locator("body").inner_text()
        has_error_ui = "unexpected error" in body.lower() or "An unexpected error" in body

        print("=== PAGE ERRORS ===")
        for e in errors:
            print(e)
        if not errors:
            print("(none)")

        print("\n=== CONSOLE (error/warn) ===")
        for line in logs:
            if "error" in line.lower() or "warn" in line.lower():
                print(line)

        print("\n=== ERROR UI VISIBLE ===", has_error_ui)
        if has_error_ui:
            pre = page.locator("pre").first
            if pre.count():
                print("\n=== STACK ===")
                print(pre.inner_text()[:3000])

        print("\n=== BODY SNIPPET ===")
        print(body[:800])

        page.screenshot(path="../test-egg-select-error.png", full_page=True)
        browser.close()


if __name__ == "__main__":
    main()
