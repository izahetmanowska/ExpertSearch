import Accordion from 'react-bootstrap/Accordion';
import type { Course } from '../types/expert';
import SectionCard from './SectionCard';

// turns papers into a JSX element
type CourseSectionCardProps = {
    courses: Course[];
};

// loads an accordion for each paper on papers with its corresponding title, abstract, etc. 
function CourseAccordions({ courses }: CourseSectionCardProps) {
    return (
        <>
            {courses.map((course, index) => (
                <Accordion.Item key={course.title} eventKey={String(index)}>
                    <Accordion.Header>{course.title}</Accordion.Header>
                    <Accordion.Body className="text-start">
                        Course period: {course.period || "No period available"} <br/>
                    </Accordion.Body>
                </Accordion.Item>
            ))}
        </>
    );
}

//creates main paper card
function CourseSectionCard({ courses }: CourseSectionCardProps) {
    return (
        <SectionCard
            title="Courses"
            items={courses}
            renderAccordions={(items) => <CourseAccordions courses={items} />}
        />
    );
}

export default CourseSectionCard;
