# this script takes the output generated from DRP (filtered by "ITU") as jason file and transforms it into a csv
# reffering to file dki-export-88675.lst

import json
import csv

data = []
with open("dki-export-88675.lst", "r", encoding="utf-8") as f:
    for line in f:
        if line.strip():
            data.append(json.loads(line))

def flatten(record):
    return {
        "id": record.get("id"),
        "title": record.get("title"),
        "year": record.get("year"),
        "type": record.get("type"),
        "review": record.get("review"),
        "lang": record.get("lang"),
        "author_count": record.get("author_count"),
        "abstract": record.get("abstract"),
        "contributors": "; ".join(record.get("contributors", [])),
        "keyword": "; ".join(record.get("keyword", [])),
        "src": "; ".join(record.get("src", [])),
        "ft_url": record.get("ft", {}).get("url"),
    }

rows = [flatten(r) for r in data]

with open("output.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)