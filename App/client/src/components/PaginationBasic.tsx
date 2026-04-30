import Pagination from 'react-bootstrap/Pagination';
import { ReactElement } from 'react';

type PaginationBasicProps = {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
};

function PaginationBasic({ currentPage, totalPages, onPageChange }: PaginationBasicProps) {
    const items: ReactElement[] = [];
    for (let i: number = 1; i <= totalPages; i++) {
        items.push(
            <Pagination.Item
                key={i}
                active={i === currentPage}
                onClick={() => onPageChange(i)}
            >
                {i}
            </Pagination.Item>
        );
    }
    return (
        <div>
            <Pagination size="sm">{items}</Pagination>
        </div>
    );
}

export default PaginationBasic;
