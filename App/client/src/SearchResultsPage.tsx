import { Form, Button } from "react-bootstrap";

// TODO: Implement cards for results

function SearchResultsPage() {
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
		</div>
	);
}

export default SearchResultsPage;