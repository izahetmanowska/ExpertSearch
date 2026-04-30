import psycopg
from typing import Any
from dbconfig import DB_CONFIG


def get_papers_by_person(person_uuid: str) -> list[dict[str, Any]]:
    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    p.title,
                    p.subtitle,
                    p.year,
                    p.abstract,
                    p."file"
                FROM paper p
                JOIN paper_contributors pc
                    ON pc.paper_uuid = p."UUID"
                WHERE pc.person_uuid = %s
                """,
                (person_uuid,),
            )

            rows = cur.fetchall()

    return [
        {
            "title": row[0],
            "subtitle": row[1] or "",
            "year": row[2] or "",
            "abstract": row[3] or "",
            "file_url": row[4] or "",
        }
        for row in rows
    ]