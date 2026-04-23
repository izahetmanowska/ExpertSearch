import os
import psycopg
from whoosh import index
from whoosh.fields import Schema, ID, TEXT

# ---------- DB CONFIG ----------
DB_CONFIG = {
    "host": "expertsearchdb.cfqcguycqydz.eu-north-1.rds.amazonaws.com",
    "dbname": "ExpertsDb",
    "user": "postgresAdmin",
    "password": "voknef-kuxziv-detwY0",
    "port": 5432,
    "sslmode": "require",
}

# ---------- WHOOSH CONFIG ----------
INDEX_DIR = "whoosh_index"

schema = Schema(
    row_id=ID(stored=True, unique=True),
    papers=TEXT(stored=True)
)

def get_or_create_index():
    if not os.path.exists(INDEX_DIR):
        os.mkdir(INDEX_DIR)
        return index.create_in(INDEX_DIR, schema)
    return index.open_dir(INDEX_DIR)

def build_index():
    ix = get_or_create_index()

    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT uuid, papers
                FROM indexed_experts
                WHERE papers IS NOT NULL
            """)
            rows = cur.fetchall()

    writer = ix.writer()

    for row_id, papers in rows:
        writer.update_document(
            row_id=str(row_id),
            papers=str(papers) if papers is not None else ""
        )

    writer.commit()
    print(f"Indexed {len(rows)} rows.")

if __name__ == "__main__":
    build_index()


    # how to reset whoosh index rm -rf whoosh_index

    # title, abstract, courses, projects