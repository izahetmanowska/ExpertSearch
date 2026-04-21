import csv
import re
import time
import argparse
from pathlib import Path
from typing import Optional, Dict, List

from playwright.sync_api import sync_playwright

BASE_URL = "https://learnit.itu.dk/local/coursebase/"

SKIP_PREFIXES = (
    "(Canceled)",
    "(Deleted)",
    "(Discontinued)",
    "(Not offered)",
)

BAD_EXACT = {
    "All courses",
    "Semester",
    "Period",
    "Programme",
    "Language",
    "ECTS",
    "Level",
    "Course type",
    "Persistent",
    "Reset Filters",
    "Favourites",
    "No favourites selected.",
    "Read more",
    "First",
    "Last",
}

BAD_CONTAINS = [
    "Toggle search input",
    "You are currently using guest access",
    "Site-wide search",
    "Perform search",
    "Skip Favourites",
    "Per Page",
    "Next →",
    "Previous",
    "Log in",
]


def clean_text(text: Optional[str]) -> str:
    if not text:
        return ""
    text = text.replace("\xa0", " ")
    return re.sub(r"\s+", " ", text).strip()


def normalize_blob(text: str) -> str:
    text = text or ""
    labels = ["ECTS", "Semester", "Language", "Exam", "Teacher", "Programme"]
    for label in labels:
        text = re.sub(rf"(?i){re.escape(label)}(?=\S)", f"{label} ", text)
    return clean_text(text)


def should_skip_course(title: str) -> bool:
    title = clean_text(title)
    return any(title.startswith(prefix) for prefix in SKIP_PREFIXES)


def looks_like_bad_title(title: str) -> bool:
    t = clean_text(title)
    if not t:
        return True
    if t in BAD_EXACT:
        return True
    if any(x.lower() in t.lower() for x in BAD_CONTAINS):
        return True
    if re.fullmatch(r"\d+", t):
        return True
    if re.fullmatch(r"[\d\s←→]+", t):
        return True
    if re.search(r"\b\d+\s+results\b", t, re.I):
        return True
    if re.search(r"^(First|Last|Next|Previous)\b", t, re.I):
        return True
    if re.search(r"\b(Teacher|Programme|Language|Exam|ECTS)\b", t):
        return True
    if re.fullmatch(r".+\s+\d+$", t) and "(" not in t and ")" not in t:
        return True
    return False


def looks_like_course_title(title: str) -> bool:
    t = clean_text(title)
    if looks_like_bad_title(t):
        return False
    if should_skip_course(t):
        return False
    if len(t) < 4 or len(t) > 180:
        return False

    if re.search(r"\((Autumn|Spring|Summer|Winter)\s+\d{4}\)$", t, re.I):
        return True
    if re.search(r"\b[SA]\d{4}\b", t):
        return True
    if " vol. " in t.lower():
        return True

    return len(t.split()) >= 2


def extract_fields(blob: str) -> Dict[str, str]:
    text = normalize_blob(blob)

    def get(label: str, next_labels: List[str]) -> str:
        if next_labels:
            next_part = "|".join(re.escape(x) for x in next_labels)
            m = re.search(
                rf"{re.escape(label)}\s+(.+?)(?=\s+(?:{next_part})\b|$)",
                text,
                re.I,
            )
        else:
            m = re.search(rf"{re.escape(label)}\s+(.+)$", text, re.I)
        return clean_text(m.group(1)) if m else ""

    programme = get("Programme", [])
    if "This course is offered" in programme:
        programme = programme.split("This course is offered", 1)[0].strip()

    return {
        "ECTS": get("ECTS", ["Semester", "Language", "Exam", "Teacher", "Programme"]),
        "Semester": get("Semester", ["Language", "Exam", "Teacher", "Programme"]),
        "Language": get("Language", ["Exam", "Teacher", "Programme"]),
        "Exam": get("Exam", ["Teacher", "Programme"]),
        "Teacher": get("Teacher", ["Programme"]),
        "Programme": programme,
        "Single Subject": "Yes" if re.search(r"This course is offered as a single subject", text, re.I) else "No",
        "Guest Students": "Yes" if re.search(r"This course is offered to guest students", text, re.I) else "No",
    }


def row_looks_suspicious(title: str, fields: Dict[str, str]) -> bool:
    semester = fields.get("Semester", "")
    teacher = fields.get("Teacher", "")

    if len(semester) > 120:
        return True
    if teacher and len(teacher.split()) > 6:
        return True
    if "(Not offered)" in semester:
        return True
    if title and semester and title in semester:
        return True

    return False


def set_per_page(page, value: str = "50"):
    try:
        page.select_option("select", label=value)
        page.wait_for_load_state("networkidle", timeout=10000)
        time.sleep(1)
        return
    except Exception:
        pass

    try:
        page.get_by_text(value, exact=True).last.click(timeout=3000)
        page.wait_for_load_state("networkidle", timeout=10000)
        time.sleep(1)
    except Exception:
        pass


def go_to_top(page):
    page.evaluate("window.scrollTo(0, 0)")
    time.sleep(0.5)


def collect_visible_course_titles_once(page) -> List[str]:
    titles: List[str] = []
    seen = set()

    candidates = page.locator("div, button, [role='button'], summary").all()

    for el in candidates:
        try:
            if not el.is_visible():
                continue
            box = el.bounding_box()
            if not box:
                continue

            if box["x"] < 20:
                continue
            if box["y"] < 80:
                continue
            if box["width"] < 900:
                continue
            if box["height"] < 30 or box["height"] > 120:
                continue

            txt = clean_text(el.inner_text())
        except Exception:
            continue

        if not looks_like_course_title(txt):
            continue

        key = txt.casefold()
        if key not in seen:
            seen.add(key)
            titles.append(txt)

    return titles


def collect_all_course_titles_on_page(page, max_scrolls: int = 30) -> List[str]:
    """
    Scrolls down the page and accumulates all visible course titles.
    This fixes the issue where only the currently visible titles were collected.
    """
    go_to_top(page)

    all_titles: List[str] = []
    seen = set()
    stable_rounds = 0
    last_count = 0

    for _ in range(max_scrolls):
        current = collect_visible_course_titles_once(page)
        for title in current:
            key = title.casefold()
            if key not in seen:
                seen.add(key)
                all_titles.append(title)

        if len(all_titles) == last_count:
            stable_rounds += 1
        else:
            stable_rounds = 0

        last_count = len(all_titles)

        if stable_rounds >= 3:
            break

        page.mouse.wheel(0, 2200)
        time.sleep(0.8)

    go_to_top(page)
    return all_titles


def find_clickable_row(page, title: str):
    candidates = page.locator("div, button, [role='button'], summary").all()

    for el in candidates:
        try:
            if not el.is_visible():
                continue
            box = el.bounding_box()
            if not box:
                continue
            if box["width"] < 900:
                continue

            txt = clean_text(el.inner_text())
            if txt == title:
                return el
        except Exception:
            continue

    return None


def click_course_row(page, title: str) -> bool:
    row = find_clickable_row(page, title)
    if row is None:
        return False

    try:
        row.scroll_into_view_if_needed(timeout=3000)
        time.sleep(0.3)
    except Exception:
        pass

    try:
        row.click(timeout=2500)
        return True
    except Exception:
        pass

    try:
        box = row.bounding_box()
        if box:
            page.mouse.click(box["x"] + 30, box["y"] + box["height"] / 2)
            return True
    except Exception:
        pass

    return False


def get_detail_blob_for_title(page, title: str) -> str:
    row = find_clickable_row(page, title)
    if row is None:
        return ""

    try:
        blob = row.evaluate(
            """(el, title) => {
                function good(txt) {
                    return txt.includes("ECTS") &&
                           txt.includes("Semester") &&
                           txt.includes("Teacher");
                }

                let node = el;
                for (let i = 0; i < 10 && node; i++) {
                    const txt = (node.innerText || "").trim();
                    if (txt.includes(title) && good(txt)) {
                        return txt;
                    }

                    let sib = node.nextElementSibling;
                    while (sib) {
                        const stxt = (sib.innerText || "").trim();
                        if (good(stxt)) {
                            return title + "\\n" + stxt;
                        }
                        sib = sib.nextElementSibling;
                    }

                    node = node.parentElement;
                }
                return "";
            }""",
            title,
        )
        if blob:
            return blob
    except Exception:
        pass

    return ""


def scrape_current_page(page) -> List[Dict[str, str]]:
    results: List[Dict[str, str]] = []

    titles = collect_all_course_titles_on_page(page)
    print(f"Found {len(titles)} course titles on current page")

    for i, title in enumerate(titles, 1):
        print(f"  [{i}/{len(titles)}] {title}")

        if should_skip_course(title):
            print("    skipped by prefix rule")
            continue

        ok = click_course_row(page, title)
        if not ok:
            print("    click failed")
            continue

        time.sleep(0.6)

        blob = get_detail_blob_for_title(page, title)
        if not blob:
            print("    no detail blob found")
            continue

        fields = extract_fields(blob)

        if row_looks_suspicious(title, fields):
            print("    suspicious row, skipped")
            continue

        print(f"    teacher={fields['Teacher']!r}")
        print(f"    semester={fields['Semester']!r}")

        results.append({
            "Course Name": title,
            "ECTS": fields["ECTS"],
            "Semester": fields["Semester"],
            "Language": fields["Language"],
            "Exam": fields["Exam"],
            "Teacher": fields["Teacher"],
            "Programme": fields["Programme"],
            "Single Subject": fields["Single Subject"],
            "Guest Students": fields["Guest Students"],
        })

    return results


def goto_next_page(page) -> bool:
    go_to_top(page)

    try:
        btn = page.get_by_text("Next →", exact=False)
        if btn.count() > 0 and btn.first.is_visible():
            btn.first.click(timeout=5000)
            page.wait_for_load_state("networkidle", timeout=15000)
            time.sleep(1.2)
            go_to_top(page)
            return True
    except Exception:
        pass

    try:
        btn = page.get_by_text("Next", exact=False)
        if btn.count() > 0 and btn.first.is_visible():
            btn.first.click(timeout=5000)
            page.wait_for_load_state("networkidle", timeout=15000)
            time.sleep(1.2)
            go_to_top(page)
            return True
    except Exception:
        pass

    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=Path("learnit_courses.csv"))
    ap.add_argument("--headless", action="store_true")
    ap.add_argument("--max-pages", type=int, default=3)
    args = ap.parse_args()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=args.headless)
        context = browser.new_context(
            viewport={"width": 1600, "height": 1100},
            java_script_enabled=True,
            locale="en-US",
        )
        page = context.new_page()

        page.goto(BASE_URL, wait_until="networkidle", timeout=60000)
        time.sleep(2)
        set_per_page(page, "50")

        all_rows: List[Dict[str, str]] = []
        seen = set()

        for page_num in range(1, args.max_pages + 1):
            print(f"\n=== Page {page_num} ===")
            page_rows = scrape_current_page(page)

            for row in page_rows:
                key = (
                    row["Course Name"],
                    row["ECTS"],
                    row["Semester"],
                    row["Language"],
                    row["Exam"],
                    row["Teacher"],
                    row["Programme"],
                    row["Single Subject"],
                    row["Guest Students"],
                )
                if key not in seen:
                    seen.add(key)
                    all_rows.append(row)

            if page_num < args.max_pages:
                if not goto_next_page(page):
                    print("No next page found, stopping.")
                    break

        with args.out.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "Course Name",
                    "ECTS",
                    "Semester",
                    "Language",
                    "Exam",
                    "Teacher",
                    "Programme",
                    "Single Subject",
                    "Guest Students",
                ],
            )
            writer.writeheader()
            writer.writerows(all_rows)

        browser.close()

    print(f"\nDone. Wrote {len(all_rows)} rows to {args.out.resolve()}")


if __name__ == "__main__":
    main()

    # cd '/Users/izahetmanowska/Desktop/ITU/research project/scripts'
    # source venv/bin/activate
    # python scripts/course_scraper.py --max-pages 108