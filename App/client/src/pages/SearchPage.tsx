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
                <Card.Subtitle className="mb-2 text-muted">For better search results</Card.Subtitle>
                <Card.Text className='betterSearch'>
                Use quotes when searching for phrases with two or more words to get better results. In search 
                engines powered by BM25 (like Whoosh), typing words without quotes treats them separately, so 
                results may include documents where the words appear far apart or in different contexts. 
                Putting the phrase in quotes (e.g., "machine learning") tells the engine to look for those 
                words together, in that exact order—giving you more precise and relevant matches.
                </Card.Text>
                <Card.Subtitle className="mb-2 text-muted">How does the search work?</Card.Subtitle>
                <Card.Text className='algoExplanation'>
                    We have implemented BM25 through Woosh. Moreover, all papers, projects and courses have been indexed by Expert
                    and we have searched these and ranked them with the following criteria:
                    <br/>
                    <ul>
                        <li>Term frequency (TF)
                            <p className='listGrandChild'>How many times a query word appears in the document (more = better, but with diminishing returns)</p>
                        </li>
                        <li>Inverse document frequency (IDF)
                            <p className='listGrandChild'>How rare the word is across all documents (rare words = more important)</p>
                        </li>
                        <li>Document length normalization
                            <p className='listGrandChild'>Penalizes very long documents so they don’t dominate</p>
                        </li>       
                    </ul>
                </Card.Text>
                <Card.Link href="https://www.geeksforgeeks.org/nlp/what-is-bm25-best-matching-25-algorithm/">BM25</Card.Link>
                <Card.Link href="https://github.com/whoosh-community/whoosh">Woosh</Card.Link>
                </Card.Body>
            </Card>
        </div>
    );
}

export default SearchPage;