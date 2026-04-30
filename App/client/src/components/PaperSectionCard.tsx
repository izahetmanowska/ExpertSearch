import Accordion from 'react-bootstrap/Accordion';
import type { Paper } from '../types/expert';
import Button from 'react-bootstrap/Button';
import SectionCard from './SectionCard';

// turns papers into a JSX element
type PaperSectionCardProps = {
    papers: Paper[];
};

// loads an accordion for each paper on papers with its corresponding title, abstract, etc. 
function PaperAccordions({ papers }: PaperSectionCardProps) {
    const openInNewTab = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };
    return (
        <>
            {papers.map((paper, index) => (
                <Accordion.Item key={paper.title} eventKey={String(index)}>
                    <Accordion.Header>{paper.title}</Accordion.Header>
                    <Accordion.Body className="text-start">
                        Subtitle: {paper.subtitle || "No subtitle available"} <br/>
                        Year: {paper.year} <br/>
                        Abstract: {paper.abstract} <br/>
                        <br/>
                        <Button
                                onClick={() => openInNewTab(paper.file_url)}
                                variant="primary"
                                size="sm"
                            >See paper
                        </Button>
                    </Accordion.Body>
                </Accordion.Item>
            ))}
        </>
    );
}

//creates main paper card
function PaperSectionCard({ papers }: PaperSectionCardProps) {
    return (
        <SectionCard
            title="Papers"
            items={papers}
            renderAccordions={(items) => <PaperAccordions papers={items} />}
        />
    );
}

export default PaperSectionCard;
