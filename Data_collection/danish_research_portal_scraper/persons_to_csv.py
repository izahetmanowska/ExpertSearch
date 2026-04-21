# this script accesses PURE in order to excract all the names of listed researchers

import requests
import csv

BASE_URL = "https://pure.itu.dk/ws/api/persons"
API_KEY = "55b39ff8-4e42-4e98-b0d9-329f1c1f9bd3"

output_file = "persons.csv"
page_size = 100

all_rows = []
offset = 0
total_count = None

headers = {
    "Accept": "application/json",
    "api-key": API_KEY,   
}

while True:
    params = {
        "offset": offset,
        "size": page_size,
    }

    response = requests.get(BASE_URL, params=params, headers=headers)
    response.raise_for_status()
    data = response.json()

    if total_count is None:
        total_count = data.get("count", 0)
        print(f"Total count reported by API: {total_count}")

    items = data.get("items", [])
    print(f"Fetched {len(items)} rows at offset {offset}")

    if not items:
        break

    for item in items:
        name = item.get("name", {})
        first_name = name.get("firstName", "").strip()
        last_name = name.get("lastName", "").strip()
        if first_name or last_name:
            all_rows.append([first_name, last_name])

    offset += len(items)
    if offset >= total_count:
        break

with open(output_file, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["first_name", "last_name"])
    writer.writerows(all_rows)

print(f"CSV file '{output_file}' created with {len(all_rows)} rows.")