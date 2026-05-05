import os
import re
from typing import Any

import psycopg
from whoosh import index
from whoosh.qparser import QueryParser, MultifieldParser, OrGroup
from whoosh.scoring import BM25F


DB_CONFIG = {
    "host": os.getenv("DB_HOST", "expertsearchdb.cfqcguycqydz.eu-north-1.rds.amazonaws.com"),
    "dbname": os.getenv("DB_NAME", "ExpertsDb"),
    "user": os.getenv("DB_USER", "postgresAdmin"),
    "password": os.getenv("DB_PASSWORD","voknef-kuxziv-detwY0"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "sslmode": os.getenv("DB_SSLMODE", "require"),
}

INDEX_DIR = "whoosh_index"
MAX_RESULTS = 15


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return " ".join(str(item) for item in value if item is not None)
    return str(value)


def normalize_name(text: str) -> str:
    return " ".join(text.lower().strip().split())


def normalize_list(value: Any) -> list[str]:
    if value is None:
        return []

    if isinstance(value, list):
        return [str(item).strip() for item in value if item is not None and str(item).strip()]

    text = str(value).strip()
    if not text:
        return []

    if "||" in text:
        parts = text.split("||")
    elif "\n" in text:
        parts = text.split("\n")
    elif ";" in text:
        parts = text.split(";")
    else:
        parts = [text]

    return [part.strip() for part in parts if part.strip()]


def tokenize_query(query_text: str) -> list[str]:
    return [token for token in re.findall(r"\w+", query_text.lower()) if len(token) > 1]


def normalize_scores(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not results:
        return results

    scores = [result["score"] for result in results]
    min_score = min(scores)
    max_score = max(scores)

    if max_score == min_score:
        for result in results:
            result["normalized_score"] = 1.0
        return results

    for result in results:
        result["normalized_score"] = round(
            (result["score"] - min_score) / (max_score - min_score),
            4,
        )

    return results


def name_probe(query_text: str, limit: int = 5) -> list[dict[str, Any]]:
    ix = index.open_dir(INDEX_DIR)

    with ix.searcher(weighting=BM25F()) as searcher:
        parser = QueryParser("person_name", schema=ix.schema, group=OrGroup.factory(0.9))
        parsed_query = parser.parse(query_text)
        results = searcher.search(parsed_query, limit=limit)

        return [
            {
                "row_id": hit["row_id"],
                "score": hit.score,
                "person_name": hit.get("person_name", ""),
            }
            for hit in results
        ]


def detect_query_type(query_text: str) -> str:
    words = query_text.strip().split()

    if len(words) == 1:
        return "single_token"

    if len(words) != 2:
        return "mixed"

    q_norm = normalize_name(query_text)

    for hit in name_probe(query_text, limit=5):
        if normalize_name(hit["person_name"]) == q_norm:
            return "full_name"

    return "mixed"


def get_field_boosts(query_text: str) -> dict[str, float]:
    query_type = detect_query_type(query_text)

    if query_type == "full_name":
        person_name_boost = 5.0
    elif query_type == "single_token":
        person_name_boost = 1.5
    else:
        person_name_boost = 1.8

    return {
        "person_name": person_name_boost,
        "paper_titles": 3.0,
        "projects": 2.4,
        "project_descriptions": 2.0,
        "paper_abstracts": 1.6,
        "courses": 1.1,
    }


def search_index(query_text: str, limit: int = 10) -> list[dict[str, Any]]:
    ix = index.open_dir(INDEX_DIR)
    boosts = get_field_boosts(query_text)

    with ix.searcher(weighting=BM25F()) as searcher:
        parser = MultifieldParser(
            [
                "person_name",
                "paper_titles",
                "projects",
                "project_descriptions",
                "paper_abstracts",
                "courses",
            ],
            schema=ix.schema,
            fieldboosts=boosts,
            group=OrGroup.factory(0.9),
        )

        parsed_query = parser.parse(query_text)
        results = searcher.search(parsed_query, limit=limit)

        return [
            {
                "row_id": hit["row_id"],
                "score": hit.score,
            }
            for hit in results
        ]


def fetch_rows_by_ids(row_ids: list[str]) -> dict[str, dict[str, Any]]:
    if not row_ids:
        return {}

    with psycopg.connect(**DB_CONFIG) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    person_id,
                    person_name,
                    person_email,
                    paper_titles,
                    paper_abstracts,
                    courses,
                    projects,
                    project_descriptions
                FROM indexed_experts
                WHERE person_id = ANY(%s)
                """,
                (row_ids,),
            )
            rows = cur.fetchall()

    return {
        str(row[0]): {
            "uuid": str(row[0]),
            "name": normalize_text(row[1]),
            "email": normalize_text(row[2]),
            "paper_titles": normalize_list(row[3]),
            "paper_abstracts": normalize_list(row[4]),
            "courses": normalize_list(row[5]),
            "projects": normalize_list(row[6]),
            "project_descriptions": normalize_list(row[7]),
        }
        for row in rows
    }


def score_item_against_query(item: str, query_text: str) -> int:
    if not item:
        return 0

    item_lower = item.lower()
    item_tokens = set(tokenize_query(item))
    query_tokens = tokenize_query(query_text)

    if not query_tokens:
        return 0

    token_hits = sum(1 for token in query_tokens if token in item_tokens)
    phrase_bonus = 3 if query_text.lower() in item_lower else 0

    return token_hits + phrase_bonus


def rank_relevant_items(items: list[str], query_text: str, limit: int = 5) -> list[str]:
    if not items:
        return []

    scored_items: list[tuple[int, str]] = []

    for item in items:
        score = score_item_against_query(item, query_text)
        if score > 0:
            scored_items.append((score, item))

    scored_items.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored_items[:limit]]


def get_relevant_evidence(row: dict[str, Any], query_text: str) -> dict[str, list[str]]:
    return {
        "paper_titles": rank_relevant_items(row["paper_titles"], query_text, limit=5),
        "paper_abstracts": rank_relevant_items(row["paper_abstracts"], query_text, limit=5),
        "courses": rank_relevant_items(row["courses"], query_text, limit=5),
        "projects": rank_relevant_items(row["projects"], query_text, limit=5),
        "project_descriptions": rank_relevant_items(row["project_descriptions"], query_text, limit=5),
    }


def has_relevant_evidence(evidence: dict[str, list[str]]) -> bool:
    return any(evidence.values())


def get_name_match_bonus(query_text: str, person_name: str, query_type: str) -> float:
    q = normalize_name(query_text)
    name = normalize_name(person_name)

    if not q or not name:
        return 0.0

    if q == name:
        return 40.0 if query_type == "full_name" else 20.0

    q_tokens = set(q.split())
    name_tokens = set(name.split())
    overlap = len(q_tokens & name_tokens)

    if query_type == "full_name":
        if overlap == 2:
            return 25.0
        if overlap == 1:
            return 8.0

    elif query_type == "single_token":
        if q in name_tokens:
            return 8.0

    else:
        return 0.0

    return 0.0


def search_people(query_text: str, limit: int = MAX_RESULTS) -> dict[str, Any]:
    limit = max(1, min(limit, MAX_RESULTS))
    query_text = query_text.strip()

    if not query_text:
        return {
            "query": query_text,
            "query_type": "empty",
            "count": 0,
            "results": [],
        }

    query_type = detect_query_type(query_text)
    is_person_query = query_type == "full_name"

    hits = search_index(query_text, limit=limit * 10)
    db_map = fetch_rows_by_ids([hit["row_id"] for hit in hits])

    ranked_results = []

    for hit in hits:
        row = db_map.get(hit["row_id"])
        if not row:
            continue

        base_score = hit["score"]
        name_bonus = get_name_match_bonus(query_text, row["name"], query_type)
        evidence = get_relevant_evidence(row, query_text)

        if not is_person_query and not has_relevant_evidence(evidence):
            continue

        adjusted_score = base_score + name_bonus

        if is_person_query and name_bonus > 0:
            adjusted_score += 5.0

        if not is_person_query and has_relevant_evidence(evidence):
            adjusted_score += 2.0

        ranked_results.append(
            {
                "uuid": row["uuid"],
                "name": row["name"],
                "email": row["email"],

                "papers": row["paper_titles"][:10],
                "projects": row["projects"][:10],
                "courses": row["courses"][:10],

                "all_papers": row["paper_titles"],
                "all_projects": row["projects"],
                "all_courses": row["courses"],

                "paper_count": len(row["paper_titles"]),
                "project_count": len(row["projects"]),
                "course_count": len(row["courses"]),

                "matched_evidence": evidence,

                "score": round(adjusted_score, 4),
            }
        )

    ranked_results.sort(key=lambda x: x["score"], reverse=True)

    final_results = ranked_results[:limit]
    final_results = normalize_scores(final_results)

    return {
        "query": query_text,
        "query_type": query_type,
        "count": len(final_results),
        "results": final_results,
    }