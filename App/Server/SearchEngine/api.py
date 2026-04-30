from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from search_papers_2 import search_people, MAX_RESULTS
from paper_url import get_papers_by_person
from projects import get_projects_by_person
from courses import get_courses_by_person
from persons import get_person_data


app = FastAPI(
    title="Expert Search API",
    version="1.0.0",
    description="API for expert retrieval using Whoosh and PostgreSQL",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- REQUEST MODEL ----------

class FileURLsRequest(BaseModel):
    papers: list[str]


# ---------- ROOT ----------

@app.get("/")
def root():
    return {
        "message": "Expert Search API is running",
        "search_endpoint": "/search?q=machine%20learning&limit=10",
        "max_limit": MAX_RESULTS,
    }


# ---------- SEARCH ----------

@app.get("/search")
def search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=MAX_RESULTS, description="Maximum number of results"),
):
    return search_people(q, limit=limit)


# ---------- PAPER DATA ----------

@app.get("/papersByPerson")
def papers_by_person(person_uuid: str):
    return {
        "person_uuid": person_uuid,
        "papers": get_papers_by_person(person_uuid)
    }
    
# ---------- PROJECT DATA ----------

@app.get("/projectsByPerson")
def projects_by_person(person_uuid: str):
    return {
        "person_uuid": person_uuid,
        "projects": get_projects_by_person(person_uuid)
    }
    
# ---------- COURSE DATA ----------

@app.get("/coursesByPerson")
def get_courses(person_uuid: str):
    return {
        "person_uuid": person_uuid,
        "courses": get_courses_by_person(person_uuid)
    }
    
# ---------- PERSON DATA ----------

@app.get("/person")
def get_courses(person_uuid: str):
    return {
        "person_uuid": person_uuid,
        "data": get_person_data(person_uuid)
    }
    