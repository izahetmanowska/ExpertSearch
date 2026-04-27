import Card from 'react-bootstrap/Card';
import { Link, useSearchParams } from 'react-router-dom';
import Stack from 'react-bootstrap/Stack'

// TODO: write function to break down output response received from the API and populate every card with the values for each expert. -> new hook?
// TODO: look into what are hooks and props

function SearchResultsPage() {
	const [searchParams] = useSearchParams();
	const query = searchParams.get('q')?.trim() ?? '';

	return (
			<Stack gap={3}>
				<CardWithExpert/>
			</Stack>
	);
}

function CardWithExpert(){
	
	return (
		<div className="p-2">
			<Card className="w-100 text-start">
				<Card.Body>
					<Card.Title>Search Results</Card.Title>
					<Card.Subtitle className="mb-2 text-muted">
						{/*{query ? `Showing results for: ${query}` : 'No search query provided yet.'}*/}
					</Card.Subtitle>
					<Card.Text>
						This is the results page placeholder. Connect your API call and render the actual result list here.
					</Card.Text>
					<Link to="/">Back to search</Link>
				</Card.Body>
			</Card>
		</div>
	);
}

export default SearchResultsPage;