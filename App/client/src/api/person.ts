import { Expert, PersonResponse } from '../types/expert';

export async function fetchPerson(query: string): Promise<Expert> {
    if (!query) {
        throw new Error('query is invalid or empty');
    }

    const url = `http://127.0.0.1:8000/person?person_uuid=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
    }

    const data = (await res.json()) as PersonResponse;
    const personData = data.data[0];

    if (!personData) {
        throw new Error('Person not found');
    }

    return {
        uuid: data.person_uuid,
        name: `${personData.first_name} ${personData.last_name}`.trim(),
        email: personData.email,
        job_title: personData.job_title,
        score: 0,
    };
}