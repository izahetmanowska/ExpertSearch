import Accordion from 'react-bootstrap/Accordion';
import type { Paper } from '../types/expert';
import Button from 'react-bootstrap/Button';
import SectionCard from './SectionCard';
import React from 'react';

// turns papers into a JSX element
type PapersSectionCardProps = {
    papers: Paper[];
};

// loads an accordion for each paper on papers with its corresponding title, abstract, etc. 
function PaperAccordions({ papers }: PapersSectionCardProps) {
    
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
                        <FileButton paper={paper}></FileButton>
                    </Accordion.Body>
                </Accordion.Item>
            ))}
        </>
    );
}

type PaperSectionCardProps = {
    paper: Paper;
};

function FileButton({ paper }: PaperSectionCardProps) {
    if (!paper.file_url) {
        return null;
    }

    const openInNewTab = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <Button onClick={() => openInNewTab(paper.file_url)} variant="primary" size="sm">
        See paper
        </Button>
    );
}


//creates main paper card
function PaperSectionCard({ papers }: PapersSectionCardProps) {
    return (
        <SectionCard
            title="Papers"
            items={papers}
            renderAccordions={(items) => <PaperAccordions papers={items} />}
        />
    );
}

export default PaperSectionCard;
