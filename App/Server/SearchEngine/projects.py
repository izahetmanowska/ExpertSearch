import psycopg
from typing import Any
from dbconfig import DB_CONFIG


def get_projects_by_person(person_uuid: str) -> list[dict[str, Any]]:
    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    p.title,
                    p.period_start_date,
                    p.period_end_date,
                    p.description
                FROM project p
                JOIN project_participants pp
                    ON pp.project_uuid = p."UUID"
                WHERE pp.person_uuid = %s
                """,
                (person_uuid,),
            )

            rows = cur.fetchall()

    return [
        {
            "title": row[0],
            "period_start_date": row[1] or "",
            "period_end_date": row[2] or "",
            "description": row[3] or "",
        }
        for row in rows
    ]