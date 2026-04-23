import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';


function SearchCard() {
	return (
		<div className="SearchCard">
            <Form className="d-flex w-100">
				<Form.Control
					type="search"
					placeholder="Search"
					className="me-2"
					aria-label="Search"
				/>
				<Button variant="light">Search</Button>
			</Form>
            <br></br>
            <TextExample/>
		</div>
	);
}

export default SearchCard;

function TextExample() {
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