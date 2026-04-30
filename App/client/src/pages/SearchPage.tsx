import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import { SubmitEventHandler, JSX, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SearchPage(): JSX.Element {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        const trimmedQuery = query.trim();
        navigate(trimmedQuery ? `/search?q=${encodeURIComponent(trimmedQuery)}` : '/search');
    };

	return (
		<div className="SearchCard">
            <Form className="d-flex w-100" onSubmit={handleSubmit}>
				<Form.Control
					type="search"
					placeholder="Search"
					className="me-2"
					aria-label="Search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
				/>
                <Button variant="light" type="submit">Search</Button>
			</Form>
            <br></br>
            <InfoCard/>
		</div>
	);
}


function InfoCard() {
    return (
        <div>
            <Card className="w-100">
                <Card.Body>
                <Card.Title>Implementation</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">How does the search work?</Card.Subtitle>
                <Card.Text>
                    We have implemented BM25 through Woosh.
                    <br/>
                    Add More text here about the scoring criteria
                </Card.Text>
                <Card.Link href="https://www.geeksforgeeks.org/nlp/what-is-bm25-best-matching-25-algorithm/">BM25</Card.Link>
                <Card.Link href="https://github.com/whoosh-community/whoosh">Woosh</Card.Link>
                </Card.Body>
            </Card>
        </div>
    );
}

export default SearchPage;