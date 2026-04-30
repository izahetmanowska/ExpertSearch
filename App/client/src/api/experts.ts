import { Expert, SearchResponse, PersonResponse } from '../types/expert';

export async function fetchExperts(query: string, limit = 15): Promise<Expert[]> {
    if (!query) {
        return [];
    }

    const url = `http://127.0.0.1:8000/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
    }

    const data = (await res.json()) as SearchResponse;
    return data.results;
}


