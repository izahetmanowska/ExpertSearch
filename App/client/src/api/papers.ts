import { Paper, PaperResponse } from '../types/expert';

export async function fetchPapers(query: string): Promise<Paper[]> {
    if (!query) {
        throw new Error('query is invalid or empty');
    }

    const url = `http://127.0.0.1:8000/papersByPerson?person_uuid=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
    }

    const data = (await res.json()) as PaperResponse;
    const papers = data.papers;
;

    if (!papers) {
        throw new Error('Papers not found');
    };

    return papers;
}