import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { Link, useNavigate } from 'react-router-dom';
import { Expert } from '../types/expert';
import ItemsList from './ItemsList';

type ExpertCardProps = {
    expert: Expert;
};

function ExpertCard({ expert }: ExpertCardProps) {
    const navigate = useNavigate();

    return (
        <div className="p-2">
            <Card className="w-100 text-start">
                <Card.Body>
                    <Card.Title>{expert.name}</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">
                        {/*{query ? `Showing results for: ${query}` : 'No search query provided yet.'}*/}
                    </Card.Subtitle>
                    <Card.Text>
                        <div>Score {expert.score}</div>
                        <div>{expert.email}</div>
                        <div>
                            Papers
                            <ItemsList items={expert.papers} />
                        </div>
                        <div>
                            Projects
                            <ItemsList items={expert.projects} />
                        </div>
                        <div>
                            Courses
                            <ItemsList items={expert.courses} />
                        </div>
                        <div>
                            <Button
                                onClick={() => navigate(`/expert?uuid=${encodeURIComponent(expert.uuid)}`)}
                                variant="primary"
                            >
                                See more
                            </Button>
                        </div>
                    </Card.Text>
                    <Link to="/">Back to search</Link>
                </Card.Body>
            </Card>
        </div>
    );
}

export default ExpertCard;
