import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import './SearchModal.css';

const SearchModal = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [category, setCategory] = useState('All');
    const inputRef = useRef(null);
    const navigate = useNavigate();

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

            // Debounce logic could be here, but for simplicity relying on user typing speed or basic delay if needed
            // jellyfinService doesn't have a generic search method exposed yet in my service wrapper?
            // Let's check or assume I can call api directly or add it.
            // Using jellyfinService.api.getSearchHints for quick results

            try {
                const user = await jellyfinService.getCurrentUser();
                if (!user) return;

                const includeItemTypes = category === 'Movies' ? 'Movie' :
                    category === 'Series' ? 'Series' :
                        category === 'People' ? 'Person' :
                            'Movie,Series,Person,Episode'; // Default

                const url = `/Users/${user.Id}/Items?searchTerm=${encodeURIComponent(query)}&headers=X-Emby-Token&IncludeItemTypes=${includeItemTypes}&Limit=20&Recursive=true&Fields=PrimaryImageAspectRatio`;
                // Better to use SearchHints endpoint if available, but Items search is standard.
                // jellyfinService.api is accessible.

                const res = await jellyfinService.api.fetch(url);
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
        else if (item.Type === 'Episode') navigate(`/series/${item.SeriesId}/episodes/${item.Id}`); // Assuming route logic
        else navigate(`/details/${item.Id}`); // Fallback
    };

    return (
        <div className={`legit-search-overlay ${isOpen ? 'visible' : ''}`} onClick={onClose}>
            <div className="legit-search-modal" onClick={e => e.stopPropagation()}>
                <div className="legit-search-header">
                    <span className="material-icons legit-search-icon">search</span>
                    <input
                        ref={inputRef}
                        className="legit-search-input"
                        placeholder="Search for movies, shows, people..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
                    />
                    <div className="legit-search-actions" onClick={onClose}>
                        <span className="legit-search-esc">ESC</span>
                    </div>
                </div>

                <div className="legit-search-categories">
                    {['All', 'Movies', 'Series', 'People'].map(cat => (
                        <div
                            key={cat}
                            className={`legit-search-category-pill ${category === cat ? 'active' : ''}`}
                            onClick={() => setCategory(cat)}
                        >
                            {cat}
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
                                style={{ backgroundImage: `url(${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?fillHeight=60&fillWidth=40&quality=90)` }}
                            ></div>
                            <div className="legit-result-info">
                                <div className="legit-result-title">{item.Name}</div>
                                <div className="legit-result-meta">
                                    <span className="legit-result-tag">{item.Type}</span>
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
