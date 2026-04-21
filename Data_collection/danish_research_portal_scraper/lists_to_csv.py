from pathlib import Path
import json
import csv

BASE_DIR = Path(__file__).resolve().parent
INPUT_FOLDER = BASE_DIR / "downloads"
OUTPUT_CSV = BASE_DIR / "danish_research_all.csv"


def load_json_objects(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read().strip()

    if not content:
        return []

    decoder = json.JSONDecoder()
    idx = 0
    n = len(content)
    objects = []

    while idx < n:
        while idx < n and content[idx].isspace():
            idx += 1

        if idx >= n:
            break

        try:
            obj, end = decoder.raw_decode(content, idx)

            if isinstance(obj, list):
                objects.extend(obj)
            else:
                objects.append(obj)

            idx = end

        except json.JSONDecodeError as e:
            print(f"JSON error in {file_path.name} near position {idx}: {e}")
            break

    return objects


def clean_text(value):
    if value is None:
        return ""
    if isinstance(value, str):
        return " ".join(value.strip().split())
    return str(value)


def unique_keep_order(items):
    seen = set()
    out = []
    for item in items:
        norm = item.casefold().strip()
        if item and norm not in seen:
            seen.add(norm)
            out.append(item)
    return out


def join_list(values):
    cleaned = [clean_text(v) for v in values]
    return "; ".join(unique_keep_order([v for v in cleaned if v]))


def get_nested(d, *keys, default=""):
    cur = d
    for key in keys:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(key)
        if cur is None:
            return default
    return cur


def filename_parts(filename):
    stem = Path(filename).stem.strip()
    parts = stem.split("__", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return stem, ""


def filename_to_person_name(filename):
    left, right = filename_parts(filename)
    left = left.replace("_", " ").strip(" ,_")
    right = right.replace("_", " ").strip(" ,_")

    if right:
        return f"{left}, {right}"
    return left


def extract_authors(record):
    authors = []

    people = record.get("person", [])
    if isinstance(people, list):
        for person in people:
            if not isinstance(person, dict):
                continue

            rolecode = clean_text(person.get("rolecode")).casefold()
            name = clean_text(person.get("name"))

            if name and rolecode in {"pau", "aut", "author", ""}:
                authors.append(name)

    if not authors:
        contributors = record.get("contributors", [])
        if isinstance(contributors, list):
            authors = [clean_text(c) for c in contributors if clean_text(c)]

    return unique_keep_order(authors)


def extract_keywords(record):
    keywords = record.get("keyword", [])
    if isinstance(keywords, list):
        return join_list(keywords)
    return clean_text(keywords)


def extract_affiliations(record):
    orgs = record.get("org", [])
    names = []
    if isinstance(orgs, list):
        for org in orgs:
            if isinstance(org, dict):
                name = clean_text(org.get("name"))
                if name:
                    names.append(name)
    return join_list(names)


def extract_source(record):
    src = record.get("src", [])
    if isinstance(src, list):
        return join_list(src)
    return clean_text(src)


def extract_doi(record):
    doi = get_nested(record, "pub", "doi", default="")
    if doi:
        return clean_text(doi)

    ft = record.get("ft", {})
    if isinstance(ft, dict) and ft.get("type") == "doi":
        url = clean_text(ft.get("url"))
        if url.startswith("https://doi.org/"):
            return url.replace("https://doi.org/", "").strip()

    return ""


def extract_journal(record):
    return clean_text(get_nested(record, "pub", "journal", default=""))


def extract_publisher(record):
    return clean_text(get_nested(record, "pub", "publisher", default=""))


def extract_open_access_url(record):
    oa_links = record.get("oa_link", [])
    if isinstance(oa_links, list) and oa_links:
        doi_links = []
        other_links = []

        for link in oa_links:
            if not isinstance(link, dict):
                continue
            url = clean_text(link.get("url"))
            if not url:
                continue
            if link.get("type") == "doi":
                doi_links.append(url)
            else:
                other_links.append(url)

        if doi_links:
            return doi_links[0]
        if other_links:
            return other_links[0]

    ft = record.get("ft", {})
    if isinstance(ft, dict):
        return clean_text(ft.get("url"))

    return ""


def extract_year(record):
    year = record.get("year")
    if year not in (None, ""):
        return clean_text(year)
    return clean_text(record.get("yearsub"))


def extract_row(record, source_file, person_from_filename):
    authors = extract_authors(record)

    return {
        "source_file": source_file,
        "author": person_from_filename,
        "title": clean_text(record.get("title")),
        "year": extract_year(record),
        "type": clean_text(record.get("type")),
        "review": clean_text(record.get("review")),
        "lang": clean_text(record.get("lang")),
        "level": clean_text(record.get("level")),
        "author_count": clean_text(record.get("author_count")),
        "authors": join_list(authors),
        "abstract": clean_text(record.get("abstract")),
        "keywords": extract_keywords(record),
        "journal": extract_journal(record),
        "publisher": extract_publisher(record),
        "doi": extract_doi(record),
        "open_access_url": extract_open_access_url(record),
        "affiliations": extract_affiliations(record),
        "source": extract_source(record),
        "url": clean_text(record.get("url")),
        "id": clean_text(record.get("id")),
    }


rows = []

lst_files = sorted(INPUT_FOLDER.glob("*.lst"))
print(f"Found {len(lst_files)} .lst files in {INPUT_FOLDER}")

for file_path in lst_files:
    person_from_filename = filename_to_person_name(file_path.name)
    objects = load_json_objects(file_path)

    print(f"{file_path.name}: parsed {len(objects)} objects")

    for i, record in enumerate(objects, start=1):
        if not isinstance(record, dict):
            print(f"  skipped non-dict object #{i}")
            continue

        row = extract_row(
            record=record,
            source_file=file_path.name,
            person_from_filename=person_from_filename,
        )
        rows.append(row)
        print(f"  kept #{i}: {row['title']}")

fieldnames = [
    "source_file",
    "author",
    "title",
    "year",
    "type",
    "review",
    "lang",
    "level",
    "author_count",
    "authors",
    "abstract",
    "keywords",
    "journal",
    "publisher",
    "doi",
    "open_access_url",
    "affiliations",
    "source",
    "url",
    "id",
]

with open(OUTPUT_CSV, "w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=fieldnames,
        delimiter=";",
        quoting=csv.QUOTE_ALL,
    )
    writer.writeheader()
    writer.writerows(rows)

print(f"Wrote {len(rows)} rows to {OUTPUT_CSV}")