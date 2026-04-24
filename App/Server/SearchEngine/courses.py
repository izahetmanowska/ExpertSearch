import psycopg
from typing import Any
from dbconfig import DB_CONFIG

def get_courses_by_person(person_uuid: str) -> list[dict[str, Any]]:
    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    c.title,
                    c.period
                FROM course c
                JOIN course_contributor cc
                    ON cc.course_id = c."id"
                WHERE cc.person_uuid = %s
                """,
                (person_uuid,),
            )

            rows = cur.fetchall()

    return [
        {
            "title": row[0],
            "period": row[1] or "",
        }
        for row in rows
    ]