import { useEffect, useState } from 'react';
import { fetchPerson } from '../api/person';
import { Expert } from '../types/expert';

export function usePerson(query: string) {
    const [expert, setExpert] = useState<Expert | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isActive = true;

        if (!query) {
            setExpert(null);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        fetchPerson(query)
            .then((data) => {
                if (isActive) {
                    setExpert(data);
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

    return { expert, loading, error };
}