import { useEffect, useState } from 'react';
import { Paper } from '../types/expert';
import { fetchPapers } from '../api/papers';

export function usePapers(query: string) {
    const [papers, setPapers] = useState<Paper[]>([]);
    const [loadingPapers, setLoading] = useState(false);
    const [papersError, setError] = useState<string | null>(null);

    useEffect(() => {
        let isActive = true;

        if (!query) {
            setPapers([]);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        fetchPapers(query)
            .then((data) => {
                if (isActive) {
                    setPapers(data);
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

    return { papers, loadingPapers, papersError };
}