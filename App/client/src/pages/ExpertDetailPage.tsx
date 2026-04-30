
import { Link, useSearchParams } from 'react-router-dom';
import { usePerson } from '../hooks/usePerson';
import LoadingSpinner from '../components/LoadingSpinner';

function ExpertDetailPage() {
    const [searchParams] = useSearchParams();
    const uuid = searchParams.get('uuid')?.trim() ?? '';
    const {expert, loading, error} = usePerson(uuid);

    if (!uuid) {
        return (
            <div>
                <div>Missing expert id.</div>
                <Link to="/">Back to search</Link>
            </div>
        );
    }

    if (loading) {
        <LoadingSpinner loading={loading} />
    }
    if (error) {
        return <div>Error: {error}</div>;
    }
    if (!expert) {
        return <div>Expert not found.</div>;
    }

    return (
        <div>
            <h1>{expert.name}</h1>
            <div>Expert detail page</div>
            <div>UUID: {uuid}</div>
            <Link to="/">Back to search</Link>
        </div>
    );
}



export default ExpertDetailPage;