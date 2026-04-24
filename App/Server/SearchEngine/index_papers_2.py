import os
import shutil
import psycopg

from whoosh import index
from whoosh.fields import Schema, ID, TEXT
from whoosh.analysis import StemmingAnalyzer

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "expertsearchdb.cfqcguycqydz.eu-north-1.rds.amazonaws.com"),
    "dbname": os.getenv("DB_NAME", "ExpertsDb"),
    "user": os.getenv("DB_USER", "postgresAdmin"),
    "password": os.getenv("DB_PASSWORD", "voknef-kuxziv-detwY0"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "sslmode": os.getenv("DB_SSLMODE", "require"),
}

INDEX_DIR = "whoosh_index"
ANALYZER = StemmingAnalyzer()

schema = Schema(
    row_id=ID(stored=True, unique=True),
    person_name=TEXT(stored=True, analyzer=ANALYZER),
    paper_titles=TEXT(stored=True, analyzer=ANALYZER),
    paper_abstracts=TEXT(stored=True, analyzer=ANALYZER),
    courses=TEXT(stored=True, analyzer=ANALYZER),
    projects=TEXT(stored=True, analyzer=ANALYZER),
    project_descriptions=TEXT(stored=True, analyzer=ANALYZER),
)


def normalize_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return " ".join(str(item) for item in value if item is not None)
    return str(value)


def reset_index():
    if os.path.exists(INDEX_DIR):
        shutil.rmtree(INDEX_DIR)


def get_or_create_index(recreate: bool = False):
    if recreate:
        reset_index()

    if not os.path.exists(INDEX_DIR):
        os.mkdir(INDEX_DIR)
        return index.create_in(INDEX_DIR, schema)

    try:
        return index.open_dir(INDEX_DIR)
    except Exception:
        shutil.rmtree(INDEX_DIR)
        os.mkdir(INDEX_DIR)
        return index.create_in(INDEX_DIR, schema)


def build_index(recreate: bool = False):
    ix = get_or_create_index(recreate=recreate)

    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    person_id,
                    person_name,
                    paper_titles,
                    paper_abstracts,
                    courses,
                    projects,
                    project_descriptions
                FROM iza_test
                WHERE
                    person_name IS NOT NULL
                    OR paper_titles IS NOT NULL
                    OR paper_abstracts IS NOT NULL
                    OR courses IS NOT NULL
                    OR projects IS NOT NULL
                    OR project_descriptions IS NOT NULL
            """)
            rows = cur.fetchall()

    writer = ix.writer()

    for (
        row_id,
        person_name,
        paper_titles,
        paper_abstracts,
        courses,
        projects,
        project_descriptions,
    ) in rows:
        writer.update_document(
            row_id=str(row_id),
            person_name=normalize_text(person_name),
            paper_titles=normalize_text(paper_titles),
            paper_abstracts=normalize_text(paper_abstracts),
            courses=normalize_text(courses),
            projects=normalize_text(projects),
            project_descriptions=normalize_text(project_descriptions),
        )

    writer.commit()
    print(f"Indexed {len(rows)} rows into '{INDEX_DIR}'.")


if __name__ == "__main__":
    build_index(recreate=True)