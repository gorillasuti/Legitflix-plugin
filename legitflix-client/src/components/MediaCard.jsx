import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { jellyfinService } from '../services/jellyfin';
import './MediaCard.css';

const MediaCard = ({ item, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [details, setDetails] = useState(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
    const hoverTimer = useRef(null);
    const cardRef = useRef(null);

    // Initial state from prop to avoid flicker before fetch
    const [userData, setUserData] = useState(item.UserData || {});

    const handleMouseEnter = () => {
        hoverTimer.current = setTimeout(async () => {
            if (cardRef.current) {
                const rect = cardRef.current.getBoundingClientRect();
                // Calculate position for portal (centered on card, slight scale up)
                // We want it strictly on top of the card visually
                setPosition({
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    height: rect.height
                });
                setIsHovered(true);

                // Fetch full details
                try {
                    const user = await jellyfinService.getCurrentUser();
                    if (user) {
                        const fullItem = await jellyfinService.getItem(user.Id, item.Id);
                        setDetails(fullItem);
                        setUserData(fullItem.UserData || {});
                    }
                } catch (e) {
                    console.error("Failed to fetch details", e);
                }
            }
        }, 500); // 500ms delay like legacy theme
    };

    const handleMouseLeave = () => {
        clearTimeout(hoverTimer.current);
        setIsHovered(false);
        setDetails(null);
    };

    const handleAction = async (e, type) => {
        e.stopPropagation();
        if (!details) return;

        try {
            const user = await jellyfinService.getCurrentUser();
            if (type === 'played') {
                const newState = !userData.Played;
                setUserData(prev => ({ ...prev, Played: newState })); // Optimistic
                await jellyfinService.markPlayed(user.Id, item.Id, newState);
            } else if (type === 'favorite') {
                const newState = !userData.IsFavorite;
                setUserData(prev => ({ ...prev, IsFavorite: newState })); // Optimistic
                await jellyfinService.markFavorite(user.Id, item.Id, newState);
            }
        } catch (err) {
            console.error("Action failed", err);
            // Revert on error? For now assume success or user retries
        }
    };

    const renderOverlay = () => {
        if (!isHovered) return null;

        // Data source: details (fetched) or fallback to item (props)
        const d = details || item;
        const rating = d.CommunityRating ? d.CommunityRating.toFixed(1) : '';
        const runTimeMinutes = d.RunTimeTicks ? Math.round(d.RunTimeTicks / 600000000) : null;
        const duration = runTimeMinutes ? `${runTimeMinutes}m` : '';
        const year = d.ProductionYear || '';

        // Portal Content
        return createPortal(
            <div
                className="media-card-hover-overlay"
                style={{
                    top: position.top - 20, // Slightly higher to pop
                    left: position.left - 20, // Slightly wider
                    width: position.width + 40,
                    minHeight: position.height + 40 // Allow growth
                }}
                onMouseLeave={handleMouseLeave}
                onClick={onClick}
            >
                <div className="media-card-hover-content">
                    <h3 className="hover-title">{d.Name}</h3>

                    <div className="hover-meta-row">
                        {rating && <span className="hover-rating">{rating} <span className="material-icons star-icon">star</span></span>}
                        {year && <span className="hover-year">{year}</span>}
                        {duration && <span className="hover-duration">{duration}</span>}
                    </div>

                    {d.Overview && <p className="hover-desc">{d.Overview}</p>}

                    <div className="hover-actions">
                        <button className="btn-action-play" title="Play">
                            <span className="material-icons">play_arrow</span>
                        </button>

                        <button
                            className={`btn-action-icon ${userData.Played ? 'active' : ''}`}
                            onClick={(e) => handleAction(e, 'played')}
                            title={userData.Played ? "Mark Unplayed" : "Mark Played"}
                        >
                            <span className="material-icons">{userData.Played ? 'check_circle' : 'check'}</span>
                        </button>

                        <button
                            className={`btn-action-icon ${userData.IsFavorite ? 'active' : ''}`}
                            onClick={(e) => handleAction(e, 'favorite')}
                            title={userData.IsFavorite ? "Unfavorite" : "Favorite"}
                        >
                            <span className="material-icons">{userData.IsFavorite ? 'favorite' : 'favorite_border'}</span>
                        </button>

                        <button className="btn-action-icon" onClick={(e) => { e.stopPropagation(); /* More info logic */ }} title="More Info">
                            <span className="material-icons">info</span>
                        </button>
                    </div>
                </div>
            </div>,
            document.body // Attach to body to escape overflow:hidden
        );
    };

    return (
        <>
            <div
                className="media-card"
                ref={cardRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={onClick}
            >
                <div className="media-card-image-container">
                    <img
                        src={`${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?fillHeight=300&fillWidth=200&quality=90`}
                        alt={item.Name}
                        className="media-card-image"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="media-card-fallback-title">{item.Name}</div>
                </div>
            </div>
            {renderOverlay()}
        </>
    );
};

export default MediaCard;
