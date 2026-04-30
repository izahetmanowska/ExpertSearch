import { Project, ProjectResponse } from '../types/expert';

export async function fetchProjects(query: string): Promise<Project[]> {
    if (!query) {
        throw new Error('query is invalid or empty');
    }

    const url = `http://127.0.0.1:8000/projectsByPerson?person_uuid=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
    }

    const data = (await res.json()) as ProjectResponse;
    const projects = data.projects;
;

    if (!projects) {
        throw new Error('Papers not found');
    };

    return projects;
}