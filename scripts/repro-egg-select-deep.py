"""Capture React errors with error boundary hook injection."""
from __future__ import annotations

from playwright.sync_api import sync_playwright

URL = "http://localhost:3000/"


def main() -> None:
    errors: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 430, "height": 932})

        page.on("pageerror", lambda err: errors.append(str(err)))
        page.on("console", lambda msg: errors.append(f"console:{msg.type}:{msg.text}") if msg.type == "error" else None)

        page.add_init_script("""
            window.__reactErrors = [];
            const orig = window.onerror;
            window.onerror = (...args) => {
                window.__reactErrors.push(args.join(' '));
                if (orig) return orig(...args);
            };
        """)

        page.goto(URL, wait_until="networkidle")
        page.evaluate("localStorage.clear(); sessionStorage.clear();")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(1000)
        page.get_by_role("button", name="게임 시작하기").first.click(force=True)
        page.wait_for_timeout(8000)

        react_errs = page.evaluate("window.__reactErrors || []")
        body = page.locator("body").inner_text()
        vite_overlay = page.locator("vite-error-overlay").count()

        print("vite overlay:", vite_overlay)
        print("error boundary:", "unexpected error" in body.lower())
        if "unexpected error" in body.lower():
            print(page.locator("pre").first.inner_text()[:4000])

        print("\npageerrors:", len(errors))
        for e in errors[:20]:
            print(e[:400])

        print("\nwindow errors:", react_errs)

        browser.close()


if __name__ == "__main__":
    main()
