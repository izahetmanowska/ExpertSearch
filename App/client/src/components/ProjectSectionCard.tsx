import Accordion from 'react-bootstrap/Accordion';
import type { Project } from '../types/expert';
import SectionCard from './SectionCard';

// turns papers into a JSX element
type ProjectSectionCardProps = {
    projects: Project[];
};

// loads an accordion for each paper on papers with its corresponding title, abstract, etc. 
function ProjectAccordions({ projects }: ProjectSectionCardProps) {
    return (
        <>
            {projects.map((project, index) => (
                <Accordion.Item key={project.title} eventKey={String(index)}>
                    <Accordion.Header>{project.title}</Accordion.Header>
                    <Accordion.Body className="text-start">
                        Project start date: {project.period_start_date || "No start date available"} <br/>
                        Project end date: {project.period_end_date || "No end date available" } <br/>
                        Description: {project.description || "No description available"} <br/>
                    </Accordion.Body>
                </Accordion.Item>
            ))}
        </>
    );
}

//creates main paper card
function ProjectSectionCard({ projects }: ProjectSectionCardProps) {
    return (
        <SectionCard
            title="Projects"
            items={projects}
            renderAccordions={(items) => <ProjectAccordions projects={items} />}
        />
    );
}

export default ProjectSectionCard;
