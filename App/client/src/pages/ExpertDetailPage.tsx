
import { Link, useSearchParams } from 'react-router-dom';
import { usePerson } from '../hooks/usePerson';
import LoadingSpinner from '../components/LoadingSpinner';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import PaperSectionCard from '../components/PaperSectionCard';
import { usePapers } from '../hooks/usePapers';
import ProjectSectionCard from '../components/ProjectSectionCard';
import { useProjects } from '../hooks/useProjects';

function ExpertDetailPage() {
    const [searchParams] = useSearchParams();
    const uuid = searchParams.get('uuid')?.trim() ?? '';
    const {expert, loadingPerson, personError} = usePerson(uuid);
    const {papers, loadingPapers, papersError} = usePapers(uuid);
    const {projects, loadingProjects, projectsError} = useProjects(uuid);

    if (loadingPerson || loadingPapers || loadingProjects ) {
        return <LoadingSpinner loading={loadingPerson || loadingPapers || loadingProjects} />;
    }
    if (personError || papersError || projectsError) {
        return <div>Error: {personError || papersError || projectsError}</div>;
    }
    if (!expert) {
        return <div>Expert not found.</div>;
    }

    return (
        <div>
            <h1>{expert.name}</h1>
            <br/>
            <h4>{expert.job_title}</h4>
            <br/>
            <h6>{expert.email}</h6>
            <div>
                <Container>
                        <br/>
                        <br/>
                        <Row>
                            <PaperSectionCard papers={papers} />
                        </Row>
                        <br/>
                        <Row>
                            <ProjectSectionCard projects={projects} />
                        </Row>
                </Container>
            </div>
            <Link to="/">Back to search</Link>
        </div>
    );
}



export default ExpertDetailPage;