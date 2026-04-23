import psycopg
from whoosh import index
from whoosh.qparser import QueryParser

DB_CONFIG = {
    "host": "expertsearchdb.cfqcguycqydz.eu-north-1.rds.amazonaws.com",
    "dbname": "ExpertsDb",
    "user": "postgresAdmin",
    "password": "voknef-kuxziv-detwY0",
    "port": 5432,
    "sslmode": "require",
}

INDEX_DIR = "whoosh_index"

def search_index(query_text, limit=10):
    ix = index.open_dir(INDEX_DIR)

    with ix.searcher() as searcher:
        parser = QueryParser("papers", schema=ix.schema)
        query = parser.parse(query_text)
        results = searcher.search(query, limit=limit)

        hits = []
        for hit in results:
            hits.append({
                "row_id": hit["row_id"],
                "score": hit.score,
                "papers": hit["papers"],
            })
        return hits

def fetch_rows_by_ids(row_ids):
    if not row_ids:
        return []

    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT uuid, papers
                FROM indexed_experts
                WHERE uuid = ANY(%s)
            """, (row_ids,))
            rows = cur.fetchall()

    row_map = {
        str(row[0]): {
            "uuid": str(row[0]),
            "papers": row[1],
        }
        for row in rows
    }

    return [row_map[row_id] for row_id in row_ids if row_id in row_map]

def search_papers(query_text, limit=10):
    hits = search_index(query_text, limit=limit)
    row_ids = [hit["row_id"] for hit in hits]
    db_rows = fetch_rows_by_ids(row_ids)
    db_map = {row["uuid"]: row for row in db_rows}

    combined = []
    for hit in hits:
        row = db_map.get(hit["row_id"])
        if row:
            combined.append({
                "uuid": row["uuid"],
                "score": hit["score"],
                "papers": row["papers"],
            })

    return combined

if __name__ == "__main__":
    query = input("Search: ").strip()
    results = search_papers(query, limit=5)

    print(f"\nFound {len(results)} results:\n")
    for i, result in enumerate(results, start=1):
        text = result["papers"] or ""
        if isinstance(text, list):
            text=" ".join(str(item)for item in text)
        preview = text[:500].replace("\n", " ")
        print(f"{i}. UUID: {result['uuid']}")
        print(f"   Score: {result['score']:.4f}")
        print(f"   Preview: {preview}")
        print()