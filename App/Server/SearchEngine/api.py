from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from search_papers_2 import search_people, MAX_RESULTS

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


@app.get("/")
def root():
    return {
        "message": "Expert Search API is running",
        "search_endpoint": "/search?q=machine%20learning&limit=10",
        "max_limit": MAX_RESULTS,
    }


@app.get("/search")
def search(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=15, description="Maximum number of results"),
):
    return search_people(q, limit=limit)