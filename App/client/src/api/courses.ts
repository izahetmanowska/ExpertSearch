import { Course, CourseResponse } from '../types/expert';

export async function fetchCourses(query: string): Promise<Course[]> {
if (!query) {
        throw new Error('query is invalid or empty');
    }

    const url = `http://127.0.0.1:8000/coursesByPerson?person_uuid=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
    }

    const data = (await res.json()) as CourseResponse;
    const courses = data.courses;
;

if (!courses) {
throw new Error('Papers not found');
    };

    return courses;
}