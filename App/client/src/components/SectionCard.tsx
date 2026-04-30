import Card from 'react-bootstrap/Card';
import Accordion from 'react-bootstrap/Accordion';
import { ReactElement, useMemo, useState } from 'react';
import PaginationBasic from './PaginationBasic';

type SectionCardProps<T> = {
    title: string;
    items: T[];
    pageSize?: number;
    renderAccordions: (items: T[]) => ReactElement;
};

function SectionCard<T>({ title, items, pageSize = 10, renderAccordions }: SectionCardProps<T>) {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const visibleItems = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return items.slice(startIndex, startIndex + pageSize);
    }, [currentPage, items, pageSize]);

    return (
        <Card>
            <Card.Header>
                <Card.Title>{title}</Card.Title>
            </Card.Header>
            <Card.Body>
                <Card.Text>
                    <Accordion defaultActiveKey="0">
                        {renderAccordions(visibleItems)}
                    </Accordion>
                    <br />
                    <PaginationBasic
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </Card.Text>
            </Card.Body>
        </Card>
    );
}

export default SectionCard;
