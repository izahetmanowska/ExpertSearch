import { useEffect, useState } from 'react';
import { fetchExperts } from '../api/experts';
import { Expert } from '../types/expert';

export function useExperts(query: string) {
    const [experts, setExperts] = useState<Expert[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isActive = true;

        if (!query) {
            setExperts([]);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        fetchExperts(query)
            .then((results) => {
                if (isActive) {
                    setExperts(results);
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

    return { experts, loading, error };
}
