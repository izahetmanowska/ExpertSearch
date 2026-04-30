import { useEffect, useState } from 'react';
import { Course } from '../types/expert';
import { fetchCourses } from '../api/courses';

export function useCourses(query: string) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoading] = useState(false);
    const [coursesError, setError] = useState<string | null>(null);

    useEffect(() => {
        let isActive = true;

        if (!query) {
            setCourses([]);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        fetchCourses(query)
            .then((data) => {
                if (isActive) {
                    setCourses(data);
                }
            })
            .catch((err) => {
                if (isActive) {
                    const message = err instanceof Error ? err.message : 'Request failed';
                    setError(message);
                }
            })
            .finally(() => {
                if (isActive) {
                    setLoading(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, [query]);

    return { courses, loadingCourses, coursesError };
}