import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import MediaCard from '../../components/MediaCard/MediaCard';
import Navbar from '../../components/Navbar';
import ContextMenu from '../../components/ContextMenu';
import CustomDropdown from '../../components/CustomDropdown';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import './Library.css';

const Library = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [libraryName, setLibraryName] = useState('');
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('DateCreated,Descending'); // Default: Date Added
    const [filter, setFilter] = useState('All'); // All, Unplayed, Favorites
    const [viewType, setViewType] = useState('Primary'); // Poster vs Backdrop (todo?)

    // Pagination / Infinite Scroll
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef();
    const ITEMS_PER_PAGE = 50;

    const [contextMenu, setContextMenu] = useState(null);
    const [deleteItem, setDeleteItem] = useState(null);

    // Initial Load & Reset on ID/Sort/Filter change
    useEffect(() => {
        setItems([]);
        setPage(0);
        setHasMore(true);
        setLoading(true);
        fetchLibraryDetails();
        fetchItems(0, true);
    }, [id, sortBy, filter]);

    const fetchLibraryDetails = async () => {
        try {
            const user = await jellyfinService.getCurrentUser();
            if (user) {
                const lib = await jellyfinService.getItem(user.Id, id);
                setLibraryName(lib.Name);
            }
        } catch (e) {
            console.error("Failed to fetch library details", e);
        }
    };

    const fetchItems = async (pageIndex, isNew = false) => {
        try {
            const user = await jellyfinService.getCurrentUser();
            if (!user) return;

            const sortParts = sortBy.split(',');
            const sortField = sortParts[0];
            const sortOrder = sortParts[1];

            const query = {
                parentId: id,
                sortBy: [sortField],
                sortOrder: [sortOrder],
                limit: ITEMS_PER_PAGE,
                startIndex: pageIndex * ITEMS_PER_PAGE,
                recursive: true,
                includeItemTypes: ['Movie', 'Series'],
                fields: ['PrimaryImageAspectRatio', 'Overview', 'DateCreated', 'ProductionYear', 'CommunityRating', 'OfficialRating', 'UserData', 'MediaSources'],
                filters: [],
            };

            if (filter === 'Unplayed') {
                query.filters.push('IsUnplayed');
            } else if (filter === 'Favorites') {
                query.filters.push('IsFavorite');
            }

            const res = await jellyfinService.getItems(user.Id, query);

            if (res && res.Items) {
                if (isNew) {
                    setItems(res.Items);
                } else {
                    setItems(prev => [...prev, ...res.Items]);
                }
                setHasMore(res.Items.length >= ITEMS_PER_PAGE);
            } else {
                setHasMore(false);
            }
        } catch (e) {
            console.error("Failed to fetch library items", e);
        } finally {
            setLoading(false);
        }
    };

    // Infinite Scroll Observer
    const lastItemElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => {
                    const nextPage = prevPage + 1;
                    fetchItems(nextPage, false);
                    return nextPage;
                });
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    // Context Menu
    const handleContextMenu = (e, item) => {
        e.preventDefault();
        setContextMenu({
            x: e.pageX,
            y: e.pageY,
            item: item
        });
    };

    const closeContextMenu = () => setContextMenu(null);

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
            case 'play':
                if (item.Type === 'Movie' || item.Type === 'Episode') navigate(`/play/${item.Id}`);
                else navigate(`/item/${item.Id}`, { state: { autoplay: true } });
                break;
            case 'download':
                window.open(jellyfinService.getDownloadUrl(item.Id), '_blank');
                break;
            case 'delete':
                setDeleteItem(item);
                break;
            case 'refresh':
                await jellyfinService.refreshItem(item.Id);
                break;
            default:
                console.log(action);
        }
    };

    const getContextMenuOptions = (item) => {
        if (!item) return [];
        return [
            { label: 'Play', icon: 'play_arrow', action: () => handleMenuAction('play', item) },
            { type: 'separator' },
            { label: 'Download', icon: 'download', action: () => handleMenuAction('download', item) },
            { label: 'Delete', icon: 'delete', danger: true, action: () => handleMenuAction('delete', item) },
            { label: 'Refresh metadata', icon: 'refresh', action: () => handleMenuAction('refresh', item) },
        ];
    };

    return (
        <div className="library-page">
            <Navbar alwaysFilled={true} />

            <div className="library-header-container">
                <div className="library-header-content">
                    <h1 className="library-title">{libraryName || 'Library'}</h1>

                    <div className="library-controls">
                        {/* Sort Dropdown */}
                        <CustomDropdown
                            icon="sort"
                            label="Sort By"
                            value={sortBy}
                            onChange={setSortBy}
                            options={[
                                { value: "DateCreated,Descending", label: "Date Added" },
                                { value: "SortName,Ascending", label: "Name (A-Z)" },
                                { value: "SortName,Descending", label: "Name (Z-A)" },
                                { value: "ProductionYear,Descending", label: "Release Date (Newest)" },
                                { value: "ProductionYear,Ascending", label: "Release Date (Oldest)" },
                                { value: "CommunityRating,Descending", label: "Rating" }
                            ]}
                        />

                        {/* Filter Dropdown */}
                        <CustomDropdown
                            icon="filter_list"
                            label="Filter By"
                            value={filter}
                            onChange={setFilter}
                            options={[
                                { value: "All", label: "All Items" },
                                { value: "Unplayed", label: "Unplayed" },
                                { value: "Favorites", label: "Favorites" }
                            ]}
                        />
                    </div>
                </div>
            </div>

            <div className="library-grid-container">
                <div className="library-grid">
                    {items.map((item, index) => {
                        // Use ref for last item to trigger infinite scroll
                        if (items.length === index + 1) {
                            return (
                                <div ref={lastItemElementRef} key={item.Id} className="library-grid-item">
                                    <MediaCard
                                        item={item}
                                        onClick={() => navigate(`/item/${item.Id}`)}
                                        onContextMenu={handleContextMenu}
                                    />
                                </div>
                            );
                        } else {
                            return (
                                <div key={item.Id} className="library-grid-item">
                                    <MediaCard
                                        item={item}
                                        onClick={() => navigate(`/item/${item.Id}`)}
                                        onContextMenu={handleContextMenu}
                                    />
                                </div>
                            );
                        }
                    })}
                </div>
                {loading && (
                    <div className="library-loader">
                        <span className="material-icons spin">autorenew</span>
                    </div>
                )}
                {!loading && items.length === 0 && (
                    <div className="empty-state">No items found.</div>
                )}
            </div>

            <DeleteConfirmationModal
                isOpen={!!deleteItem}
                onClose={() => setDeleteItem(null)}
                onConfirm={handleConfirmDelete}
                itemName={deleteItem?.Name}
                itemType={deleteItem?.Type}
            />

            {
                contextMenu && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        options={getContextMenuOptions(contextMenu.item)}
                        onClose={closeContextMenu}
                    />
                )
            }
        </div >
    );
};

export default Library;
