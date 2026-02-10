import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import './SearchModal.css';

const SearchModal = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [category, setCategory] = useState({ Name: 'All', Id: 'All' });
    const [views, setViews] = useState([{ Name: 'All', Id: 'All' }]);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    // Fetch Views for Categories
    useEffect(() => {
        const fetchViews = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                if (user) {
                    const res = await jellyfinService.getUserViews(user.Id);
                    if (res && res.Items) {
                        setViews([{ Name: 'All', Id: 'All' }, ...res.Items]);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch views", e);
            }
        };
        fetchViews();
    }, []);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchResults = async () => {
            if (query.trim().length === 0) {
                setResults([]);
                return;
            }

            try {
                const user = await jellyfinService.getCurrentUser();
                if (!user) return;

                // Search logic: If 'All', search globally. If specific view, restrict by ParentId.
                const res = await jellyfinService.searchItems(
                    user.Id,
                    query,
                    ['Movie', 'Series', 'Person', 'BoxSet'],
                    category.Id
                );

                setResults(res.Items || []);

            } catch (e) {
                console.error("Search failed", e);
            }
        };

        const timeoutId = setTimeout(fetchResults, 300); // 300ms debounce
        return () => clearTimeout(timeoutId);
    }, [query, category]);

    if (!isOpen) return null;

    const handleItemClick = (item) => {
        onClose();
        if (item.Type === 'Movie') navigate(`/movie/${item.Id}`);
        else if (item.Type === 'Series') navigate(`/series/${item.Id}`);
        else if (item.Type === 'Person') navigate(`/person/${item.Id}`); // Assuming person route
        else if (item.Type === 'BoxSet') navigate(`/collections/${item.Id}`);
        else navigate(`/details/${item.Id}`);
    };

    return (
        <div className={`legit-search-overlay ${isOpen ? 'visible' : ''}`} onClick={onClose}>
            <div className="legit-search-modal" onClick={e => e.stopPropagation()}>
                <div className="legit-search-header">
                    <span className="material-icons legit-search-icon">search</span>
                    <input
                        ref={inputRef}
                        className="legit-search-input"
                        placeholder="Search..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
                    />
                    <div className="legit-search-actions" onClick={onClose}>
                        <span className="legit-search-esc">esc</span>
                        <span className="legit-search-close">Close</span>
                    </div>
                </div>

                <div className="legit-search-categories">
                    {views.map(view => (
                        <div
                            key={view.Id}
                            className={`legit-search-category-pill ${category.Id === view.Id ? 'active' : ''}`}
                            onClick={() => setCategory(view)}
                        >
                            {view.Name}
                        </div>
                    ))}
                </div>

                <div className="legit-search-results">
                    {results.length === 0 && query.length > 0 && (
                        <div className="legit-no-results">No results found for "{query}"</div>
                    )}

                    {results.map(item => (
                        <div key={item.Id} className="legit-search-result-item" onClick={() => handleItemClick(item)}>
                            <div
                                className="legit-result-thumb"
                                style={{
                                    backgroundImage: `url(${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?fillHeight=60&fillWidth=40&quality=90)`,
                                    backgroundColor: '#222'
                                }}
                            >
                                {!item.ImageTags?.Primary && <span className="material-icons legit-result-icon-fallback">movie</span>}
                            </div>
                            <div className="legit-result-info">
                                <div className="legit-result-title">{item.Name}</div>
                                <div className="legit-result-meta">
                                    <span className="legit-result-tag">{item.Type?.toUpperCase()}</span>
                                    {item.ProductionYear && <span>{item.ProductionYear}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SearchModal;
