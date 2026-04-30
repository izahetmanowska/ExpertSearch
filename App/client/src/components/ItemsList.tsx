type ItemsListProps = {
    items?: string[];
    emptyLabel?: string;
};

function ItemsList({ items = [], emptyLabel = 'No items' }: ItemsListProps) {
    if (items.length === 0) {
        return (
            <ul>
                <li>{emptyLabel}</li>
            </ul>
        );
    }

    return (
        <ul>
            {items.map((element, index) => (
                <li key={`${element}-${index}`}>{element}</li>
            ))}
        </ul>
    );
}

export default ItemsList;
