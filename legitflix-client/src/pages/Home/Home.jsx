import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

// ... (existing imports)

const Home = () => {
    // ... (existing state)
    const [contextMenu, setContextMenu] = useState(null);
    const [deleteItem, setDeleteItem] = useState(null);

    // ... (useEffect)

    // ... (handlePlay, openModal, closeModal, handleContextMenu, closeContextMenu)

    const handleConfirmDelete = async () => {
        if (deleteItem) {
            try {
                await jellyfinService.deleteItem(deleteItem.Id);
                setDeleteItem(null);
                window.location.reload();
            } catch (e) {
                console.error("Failed to delete item", e);
                alert("Failed to delete item. Check console.");
            }
        }
    };

    const handleMenuAction = async (action, item) => {
        closeContextMenu();
        switch (action) {
            // ... (other cases)
            case 'delete':
                setDeleteItem(item);
                break;
            // ... (rest of cases)
        }
    };

    // ... (getContextMenuOptions)

    return (
        <div className="home-page">
            {/* ... (existing JSX) */}

            <InfoModal
                itemId={modalItem}
                isOpen={!!modalItem}
                onClose={closeModal}
            />

            <DeleteConfirmationModal
                isOpen={!!deleteItem}
                onClose={() => setDeleteItem(null)}
                onConfirm={handleConfirmDelete}
                itemName={deleteItem?.Name}
                itemType={deleteItem?.Type}
            />

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    options={getContextMenuOptions(contextMenu.item, contextMenu.section)}
                    onClose={closeContextMenu}
                />
            )}
        </div>
    );
};

export default Home;
