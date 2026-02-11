import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { jellyfinService } from '../services/jellyfin';
import './MediaCard.css';

const MediaCard = ({ item, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [details, setDetails] = useState(null);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const hoverTimer = useRef(null);
    const cardRef = useRef(null);
    const [userData, setUserData] = useState(item.UserData || {});

    const handleMouseEnter = () => {
        hoverTimer.current = setTimeout(async () => {
            if (cardRef.current) {
                const rect = cardRef.current.getBoundingClientRect();
                setPosition({
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    height: rect.height
                });
                setIsHovered(true);

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
        }, 500);
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
                setUserData(prev => ({ ...prev, Played: newState }));
                await jellyfinService.markPlayed(user.Id, item.Id, newState);
            } else if (type === 'favorite') {
                const newState = !userData.IsFavorite;
                setUserData(prev => ({ ...prev, IsFavorite: newState }));
                await jellyfinService.markFavorite(user.Id, item.Id, newState);
            }
        } catch (err) {
            console.error("Action failed", err);
        }
    };

    // Build subtitle text (e.g. "Sub | Dub" or "Subtitled" or "2024")
    const getSubtitle = () => {
        const parts = [];
        if (item.ProductionYear) parts.push(item.ProductionYear);
        if (item.Type === 'Series' && item.Status === 'Continuing') parts.push('Airing');
        return parts.join(' · ') || '';
    };

    const renderOverlay = () => {
        if (!isHovered) return null;

        const d = details || item;
        const rating = d.CommunityRating ? d.CommunityRating.toFixed(1) : '';
        const voteCount = d.VoteCount ? `(${(d.VoteCount / 1000).toFixed(1)}K)` : '';
        const year = d.ProductionYear || '';
        const seasons = d.ChildCount;
        const episodes = d.RecursiveItemCount || d.ChildCount;

        const overlayWidth = position.width * 3;
        const overlayHeight = position.height * 0.85;

        // Position: shift left to show detail panel on left + poster on right
        const leftPos = Math.max(10, position.left - (overlayWidth - position.width) + position.width * 0.1);
        const topPos = position.top - 20;

        return createPortal(
            <div
                className="media-card-hover-overlay"
                style={{
                    top: topPos,
                    left: leftPos,
                    width: overlayWidth,
                    height: overlayHeight,
                }}
                onMouseLeave={handleMouseLeave}
                onClick={onClick}
            >
                {/* Left: Details Panel */}
                <div className="hover-panel-left">
                    <h3 className="hover-title">{d.Name}</h3>

                    <div className="hover-meta-row">
                        {rating && (
                            <span className="hover-rating">
                                {rating} <span className="material-icons star-icon">star</span>
                                {voteCount && <span className="hover-rating-count">{voteCount}</span>}
                            </span>
                        )}
                    </div>

                    {d.Type === 'Series' && (
                        <div className="hover-stats">
                            {seasons && <div>{seasons} Season{seasons !== 1 ? 's' : ''}</div>}
                            {episodes && <div>{episodes} Episode{episodes !== 1 ? 's' : ''}</div>}
                        </div>
                    )}

                    {year && d.Type !== 'Series' && (
                        <div className="hover-stats">{year}</div>
                    )}

                    {d.Overview && <p className="hover-desc">{d.Overview}</p>}

                    <div className="hover-actions">
                        <button className="btn-action-icon" title="Play" onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}>
                            <span className="material-icons">play_arrow</span>
                        </button>
                        <button
                            className={`btn-action-icon ${userData.IsFavorite ? 'active' : ''}`}
                            onClick={(e) => handleAction(e, 'favorite')}
                            title={userData.IsFavorite ? "Unfavorite" : "Favorite"}
                        >
                            <span className="material-icons">{userData.IsFavorite ? 'bookmark' : 'bookmark_border'}</span>
                        </button>
                        <button
                            className={`btn-action-icon ${userData.Played ? 'active' : ''}`}
                            onClick={(e) => handleAction(e, 'played')}
                            title={userData.Played ? "Mark Unplayed" : "Mark Played"}
                        >
                            <span className="material-icons">add</span>
                        </button>
                    </div>
                </div>

                {/* Right: Poster Image */}
                <div className="hover-panel-right">
                    <img
                        src={`${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?fillHeight=500&fillWidth=340&quality=90`}
                        alt={d.Name}
                    />
                </div>
            </div>,
            document.body
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
                        src={`${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?fillHeight=500&fillWidth=340&quality=90`}
                        alt={item.Name}
                        className="media-card-image"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <div className="media-card-fallback-title">{item.Name}</div>
                </div>
                <div className="media-card-info">
                    <div className="media-card-title">{item.Name}</div>
                    {getSubtitle() && <div className="media-card-subtitle">{getSubtitle()}</div>}
                </div>
            </div>
            {renderOverlay()}
        </>
    );
};

export default MediaCard;
