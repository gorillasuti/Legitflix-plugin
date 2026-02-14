import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

// ... (existing imports)

const Library = () => {
    // ... (existing state)
    const [contextMenu, setContextMenu] = useState(null);
    const [deleteItem, setDeleteItem] = useState(null);

    // ... (useEffect, fetchLibraryDetails, fetchItems, lastItemElementRef, handleContextMenu, closeContextMenu)

    const handleConfirmDelete = async () => {
        if (deleteItem) {
            try {
                await jellyfinService.deleteItem(deleteItem.Id);
                // Remove from local list
                setItems(prev => prev.filter(i => i.Id !== deleteItem.Id));
                setDeleteItem(null);
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
        <div className="library-page">
            <Navbar alwaysFilled={true} />

            <div className="library-header-container">
                {/* ... (existing header content) */}
            </div>

            <div className="library-grid-container">
                {/* ... (existing grid content) */}
            </div>

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
                    options={getContextMenuOptions(contextMenu.item)}
                    onClose={closeContextMenu}
                />
            )}
        </div>
    );
};

export default Library;
