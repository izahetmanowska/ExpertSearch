# this script is a scraper made to obtain all researchers data from DRP

from pathlib import Path
import pandas as pd
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

URL = "https://local.forskningsportal.dk/search/78730"

BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "persons_compatible.csv"
DOWNLOAD_DIR = BASE_DIR / "downloads"


def safe_filename(text: str, max_len: int = 120) -> str:
    cleaned = "".join(c if c.isalnum() or c in (" ", "-", "_") else "_" for c in str(text))
    cleaned = "_".join(cleaned.split())
    return cleaned[:max_len] if cleaned else "export"


def choose_contributors(page):
    dropdown = page.locator("select").first
    dropdown.wait_for(state="visible", timeout=15000)

    try:
        dropdown.select_option(label="Contributors")
        print("Selected: Contributors")
        return
    except Exception:
        pass

    options = dropdown.locator("option")
    count = options.count()
    for i in range(count):
        option = options.nth(i)
        label = option.inner_text().strip()
        value = option.get_attribute("value")
        if "contributors" in label.lower():
            dropdown.select_option(value=value)
            print(f"Selected via fallback: {label}")
            return

    raise RuntimeError("Could not find 'Contributors' in the dropdown.")


def fill_search_value(page, value: str):
    text_inputs = page.locator("input[type='text']")
    count = text_inputs.count()
    if count == 0:
        raise RuntimeError("No text input found.")

    for i in range(count):
        inp = text_inputs.nth(i)
        if inp.is_visible():
            inp.fill("")
            inp.fill(value)
            print(f"Filled search with: {value}")
            return

    raise RuntimeError("No visible text input found.")


def click_search(page):
    search_button = page.get_by_role("button", name="Search")
    search_button.wait_for(state="visible", timeout=15000)
    search_button.click()
    print("Clicked Search")

    # Give results time to load
    page.wait_for_timeout(3000)


def export_results(page, output_dir: Path, stem: str):
    export_button = page.get_by_role("button", name="Export Results")
    export_button.wait_for(state="visible", timeout=15000)
    export_button.scroll_into_view_if_needed()
    page.wait_for_timeout(500)

    export_button.click(force=True)
    print("Clicked Export Results")

    # Wait for popup option to appear
    json_option = page.get_by_text(
        "List of JSON records", exact=False
    )
    json_option.wait_for(state="visible", timeout=15000)

    with page.expect_download(timeout=60000) as download_info:
        json_option.click()
        print("Clicked: List of JSON records")

    download = download_info.value
    suggested = download.suggested_filename
    suffix = Path(suggested).suffix or ".json"
    target = output_dir / f"{stem}{suffix}"
    download.save_as(str(target))
    print(f"Saved download: {target}")
    return target


def main():
    print("Looking for CSV at:", CSV_PATH)
    print("CSV exists:", CSV_PATH.exists())

    if not CSV_PATH.exists():
        raise FileNotFoundError(f"CSV not found: {CSV_PATH}")

    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(CSV_PATH)

    if "combined" not in df.columns:
        raise ValueError("CSV must contain a column named 'combined'.")

    values = (
        df["combined"]
        .dropna()
        .astype(str)
        .map(str.strip)
    )
    values = [v for v in values if v]

    if not values:
        raise ValueError("No non-empty values found in the 'combined' column.")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=300)
        context = browser.new_context(accept_downloads=True)
        page = context.new_page()

        for idx, value in enumerate(values, start=1):
            print(f"\n[{idx}/{len(values)}] Searching for: {value}")

            try:
                page.goto(URL, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(2000)

                choose_contributors(page)
                fill_search_value(page, value)
                click_search(page)

                export_results(page, DOWNLOAD_DIR, safe_filename(value))

            except PlaywrightTimeoutError as e:
                print(f"Timeout for '{value}': {e}")
                page.screenshot(
                    path=str(DOWNLOAD_DIR / f"{safe_filename(value)}_timeout.png"),
                    full_page=True
                )
            except Exception as e:
                print(f"Failed for '{value}': {e}")
                page.screenshot(
                    path=str(DOWNLOAD_DIR / f"{safe_filename(value)}_error.png"),
                    full_page=True
                )

        context.close()
        browser.close()


if __name__ == "__main__":
    main()