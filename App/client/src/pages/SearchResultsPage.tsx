import Stack from 'react-bootstrap/Stack';
import { useSearchParams } from 'react-router-dom';
import ExpertCard from '../components/ExpertCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useExperts } from '../hooks/useExperts';

function SearchResultsPage() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q')?.trim() ?? '';
    const { experts, loading, error } = useExperts(query);

    return (
        <>
            <LoadingSpinner loading={loading} text={"Searching our Database for the best fit for your query"} />
            {!loading && (
                <Stack gap={3}>
                    {error && <div>{error}</div>}
                    {experts.length === 0 && !loading && !error && <div>No results</div>}
                    {experts.map((expert) => (
                        <ExpertCard key={expert.uuid} expert={expert} />
                    ))}
                </Stack>
            )}
        </>
    );
}

export default SearchResultsPage;
