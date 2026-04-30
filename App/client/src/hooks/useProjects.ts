import { useEffect, useState } from 'react';
import { Project } from '../types/expert';
import { fetchProjects } from '../api/projects';

export function useProjects(query: string) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loadingProjects, setLoading] = useState(false);
    const [projectsError, setError] = useState<string | null>(null);

    useEffect(() => {
        let isActive = true;

        if (!query) {
            setProjects([]);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        fetchProjects(query)
            .then((data) => {
                if (isActive) {
                    setProjects(data);
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

    return { projects, loadingProjects, projectsError };
}