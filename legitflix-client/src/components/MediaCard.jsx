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

    const handleMouseEnter = async () => {
        if (hoverTimer.current) {
            clearTimeout(hoverTimer.current);
            hoverTimer.current = null;
        }

        if (cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            setPosition({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height // Track full height including info
            });
            setIsHovered(true);

            if (!details) {
                try {
                    const user = await jellyfinService.getCurrentUser();
                    if (user) {
                        // Use getItemDetails to get MediaSources/MediaStreams
                        const fullItem = await jellyfinService.getItemDetails(user.Id, item.Id);
                        setDetails(fullItem);
                        setUserData(fullItem.UserData || {});
                    }
                } catch (e) {
                    console.error("Failed to fetch details", e);
                }
            }
        }
    };

    const handleMouseLeave = () => {
        hoverTimer.current = setTimeout(() => {
            setIsHovered(false);
        }, 100); // 100ms grace period
    };

    const handleOverlayEnter = () => {
        if (hoverTimer.current) {
            clearTimeout(hoverTimer.current);
            hoverTimer.current = null;
        }
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

    const getSubDubDisplay = (itemDetails) => {
        if (!itemDetails || !itemDetails.MediaSources || !itemDetails.MediaSources[0]) return null;

        const streams = itemDetails.MediaSources[0].MediaStreams || [];
        if (streams.length === 0) return null;

        const audioStreams = streams.filter(s => s.Type === 'Audio');
        const subStreams = streams.filter(s => s.Type === 'Subtitle');

        const hasEnglishAudio = audioStreams.some(s =>
            (s.Language === 'eng' || s.Language === 'en' || s.Language === 'english') ||
            (s.DisplayTitle && s.DisplayTitle.toLowerCase().includes('eng'))
        );

        const hasJapaneseAudio = audioStreams.some(s =>
            (s.Language === 'jpn' || s.Language === 'ja' || s.Language === 'japanese') ||
            (s.DisplayTitle && s.DisplayTitle.toLowerCase().includes('jap'))
        );

        const hasEnglishSubs = subStreams.some(s =>
            (s.Language === 'eng' || s.Language === 'en' || s.Language === 'english') ||
            (s.DisplayTitle && s.DisplayTitle.toLowerCase().includes('eng'))
        );

        // Logic for display
        if (hasEnglishAudio && (hasJapaneseAudio || hasEnglishSubs)) {
            return "Sub | Dub";
        }
        if (hasEnglishAudio) {
            return "Dub";
        }
        if (hasEnglishSubs) {
            return "Sub";
        }

        return null;
    };

    const renderOverlay = () => {
        if (!isHovered) return null;

        const d = details || item;
        const rating = d.CommunityRating ? d.CommunityRating.toFixed(1) : '';
        const voteCount = d.VoteCount ? `(${(d.VoteCount / 1000).toFixed(1)}K)` : '';
        const seasons = d.ChildCount;
        const episodes = d.RecursiveItemCount || d.ChildCount;
        const subDub = getSubDubDisplay(d);

        // Overlay dimensions: Fixed pixel increase
        // Width: +4px (2px each side)
        // Height: +8px (4px top, 4px bottom)
        const overlayWidth = position.width + 4;
        const overlayHeight = position.height + 8;

        const leftPos = position.left - 2;
        const topPos = position.top - 4;

        // Use Primary image for portrait background
        const bgUrl = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?fillHeight=600&fillWidth=400&quality=90`;

        return createPortal(
            <div
                className="media-card-hover-overlay"
                style={{
                    top: topPos,
                    left: leftPos,
                    width: overlayWidth,
                    minHeight: overlayHeight,
                    backgroundImage: `url('${bgUrl}')`
                }}
                onMouseEnter={handleOverlayEnter}
                onMouseLeave={handleMouseLeave}
                onClick={onClick}
            >
                <div className="hover-overlay-gradient"></div>
                <div className="hover-overlay-content">
                    <div className="hover-info-group">
                        <h3 className="hover-title">{d.Name}</h3>

                        <div className="hover-meta-row">
                            {rating && (
                                <span className="hover-rating">
                                    {rating} <span className="material-icons star-icon">star</span>
                                    {voteCount && <span className="hover-rating-count">{voteCount}</span>}
                                </span>
                            )}
                            <span className="hover-meta-separator">•</span>
                            <div className="hover-stats">
                                {d.Type === 'Series' ? (
                                    <>
                                        {seasons ? <span>{seasons} Seasons</span> : null}
                                        {seasons && episodes ? <span> • </span> : null}
                                        {episodes ? <span>{episodes} Episodes</span> : null}
                                    </>
                                ) : (
                                    <span>{d.ProductionYear}</span>
                                )}
                                {subDub && (
                                    <>
                                        <span> • </span>
                                        <span style={{ color: '#fff', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.3)', padding: '0 4px', borderRadius: '3px', fontSize: '0.7rem' }}>
                                            {subDub}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {d.Overview && <p className="hover-desc">{d.Overview}</p>}
                    </div>

                    <div className="hover-actions">
                        <button className="btn-action-icon play-icon" title="Play" onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}>
                            <span className="material-icons">play_arrow</span>
                        </button>
                        <button
                            className={`btn-action-icon bookmark-icon ${userData.IsFavorite ? 'active' : ''}`}
                            onClick={(e) => handleAction(e, 'favorite')}
                            title={userData.IsFavorite ? "Unfavorite" : "Favorite"}
                        >
                            <span className="material-icons">{userData.IsFavorite ? 'bookmark' : 'bookmark_border'}</span>
                        </button>
                        <button
                            className={`btn-action-icon plus-icon ${userData.Played ? 'active' : ''}`}
                            onClick={(e) => handleAction(e, 'played')}
                            title={userData.Played ? "Mark Unplayed" : "Mark Played"}
                        >
                            <span className="material-icons">add</span>
                        </button>
                    </div>
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
