import Card from 'react-bootstrap/Card';
import { Link, useSearchParams } from 'react-router-dom';

function SearchResultsPage() {
	const [searchParams] = useSearchParams();
	const query = searchParams.get('q')?.trim() ?? '';

	return (
		<Card className="w-100 text-start">
			<Card.Body>
				<Card.Title>Search Results</Card.Title>
				<Card.Subtitle className="mb-2 text-muted">
					{query ? `Showing results for: ${query}` : 'No search query provided yet.'}
				</Card.Subtitle>
				<Card.Text>
					This is the results page placeholder. Connect your API call and render the actual result list here.
				</Card.Text>
				<Link to="/">Back to search</Link>
			</Card.Body>
		</Card>
	);
}

export default SearchResultsPage;