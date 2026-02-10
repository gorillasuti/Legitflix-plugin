import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../services/jellyfin';
import { useTheme } from '../context/ThemeContext';
import './HeroCarousel.css';

const HeroCarousel = ({ onInfoClick }) => {
    const { config } = useTheme();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    // Track previous index to handle "completed" state logic if needed, 
    // but standard comparison index < currentIndex is enough for rendering.

    const intervalRef = useRef(null);
    const containerRef = useRef(null);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                if (!user) {
                    console.error("No user found for HeroCarousel. jellyfinService.api:", jellyfinService.api);
                    setLoading(false);
                    return;
                }
                console.log("[HeroCarousel] User found:", user.Name, user.Id);

                const query = {
                    includeItemTypes: config.heroMediaTypes,
                    recursive: true,
                    sortBy: 'DateCreated',
                    sortOrder: 'Descending',
                    limit: 20, // Fetch more to slice later
                    fields: ['PrimaryImageAspectRatio', 'Overview', 'ProductionYear', 'OfficialRating', 'CommunityRating', 'RunTimeTicks', 'Genres', 'MediaStreams', 'UserData', 'ImageTags', 'BackdropImageTags'],
                    imageTypeLimit: 1,
                    enableImageTypes: ['Backdrop', 'Primary', 'Logo']
                };

                const response = await jellyfinService.getItems(user.Id, query);
                let allItems = response.Items || [];

                // Filter items that actually have backdrops
                let fetchedItems = allItems.filter(i => i.BackdropImageTags && i.BackdropImageTags.length > 0);

                // Use logic from theme: if > 3 items, slice 3 to 9 (Next 6). Else show all.
                // This mimics the "Latest 6 items after promo" logic.
                const validItems = fetchedItems.length > 3 ? fetchedItems.slice(3, 9) : fetchedItems.slice(0, 6);

                // Fetch Next Up for Series
                for (const item of validItems) {
                    if (item.Type === 'Series') {
                        try {
                            const nextUp = await jellyfinService.getNextUp(user.Id, item.Id);
                            if (nextUp.Items && nextUp.Items.length > 0) {
                                item._nextUp = nextUp.Items[0];
                            }
                        } catch (e) {
                            console.warn('Failed to fetch Next Up', e);
                        }
                    }
                }

                setItems(validItems);

                // Trigger initial animation for first slide
                // In React, this happens automatically on mount if we set active class based on index
            } catch (err) {
                console.error("HeroCarousel fetch error", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [config]);

    // Carousel Logic
    const nextSlide = () => {
        setItems(currentItems => {
            if (currentItems.length === 0) return currentItems;
            setCurrentIndex(prev => (prev + 1) % currentItems.length);
            return currentItems;
        });
    };

    const goToSlide = (index) => {
        setCurrentIndex(index);
        resetTimer();
    };

    const resetTimer = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(nextSlide, 8000);

        // Remove paused class if present (if we had mouseover logic)
        if (containerRef.current) containerRef.current.classList.remove('carousel-paused');
    };

    const handleInteraction = () => {
        resetTimer();
    };

    useEffect(() => {
        if (items.length > 0) {
            resetTimer();
        }
        return () => clearInterval(intervalRef.current);
    }, [items]);


    const toggleFav = async (e, item) => {
        e.stopPropagation(); // Prevent navigation
        const btn = e.currentTarget;

        // Optimistic UI update
        const isFav = item.UserData?.IsFavorite;
        // We need to update local state to reflect change immediately
        // This is tricky without updating the main items list, or we use local state for the button?
        // Let's force update the items list

        const newItem = { ...item, UserData: { ...item.UserData, IsFavorite: !isFav } };

        setItems(prev => prev.map(i => i.Id === item.Id ? newItem : i));

        try {
            const user = await jellyfinService.getCurrentUser();
            if (user) {
                await jellyfinService.markFavorite(user.Id, item.Id, !isFav);
            }
        } catch (err) {
            console.error("Failed to toggle fav", err);
            // Revert
            setItems(prev => prev.map(i => i.Id === item.Id ? item : i));
        }
    };


    if (loading) return null;
    if (items.length === 0) return null;

    // Helper functions
    const getBackdropUrl = (id) => `${jellyfinService.api.basePath}/Items/${id}/Images/Backdrop/0?maxHeight=1080&quality=96`;
    const getLogoUrl = (id) => `${jellyfinService.api.basePath}/Items/${id}/Images/Logo?maxHeight=200&maxWidth=450&quality=90`;

    const getSubDubText = (item) => {
        let audioLangs = new Set();
        let subLangs = new Set();
        if (item.MediaStreams) {
            item.MediaStreams.forEach(stream => {
                if (stream.Type === 'Audio' && stream.Language) audioLangs.add(stream.Language);
                if (stream.Type === 'Subtitle' && stream.Language) subLangs.add(stream.Language);
            });
        }
        const hasSub = subLangs.size > 0;
        const hasDub = audioLangs.size > 1;
        if (hasSub && hasDub) return 'Sub | Dub';
        if (hasSub) return 'Sub';
        if (hasDub) return 'Dub';
        return '';
    };

    const getEndsAtHtml = (item) => {
        if (item.RunTimeTicks && item.Type !== 'Series') {
            const ms = item.RunTimeTicks / 10000;
            const endTime = new Date(Date.now() + ms);
            const timeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            return (
                <>
                    <span className="hero-meta-divider">•</span>
                    <span className="hero-meta-text">Ends at {timeStr}</span>
                </>
            );
        }
        return null;
    };

    return (
        <div id="legit-hero-carousel" className="hero-carousel-container" ref={containerRef}>
            {items.map((item, index) => {
                const isActive = index === currentIndex;
                const subDub = getSubDubText(item);
                const endsAt = getEndsAtHtml(item);
                const hasLogo = item.ImageTags && item.ImageTags.Logo;

                let btnText = 'START WATCHING';
                let btnSubText = '';

                if (item.Type === 'Series') {
                    if (item._nextUp) {
                        const s = item._nextUp.ParentIndexNumber;
                        const e = item._nextUp.IndexNumber;
                        btnText = 'CONTINUE';
                        btnSubText = `S${s} E${e}`;
                    } else {
                        btnSubText = 'S1 E1';
                    }
                } else {
                    if (item.UserData && item.UserData.PlaybackPositionTicks > 0) {
                        const pct = Math.round((item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100);
                        if (pct > 2 && pct < 90) {
                            btnText = 'CONTINUE';
                            btnSubText = ` - ${pct}%`;
                        }
                    }
                }

                const isFav = item.UserData?.IsFavorite;

                return (
                    <div
                        key={item.Id}
                        className={`hero-slide ${isActive ? 'active' : ''}`}
                        data-index={index}
                    >
                        <div
                            className="hero-backdrop"
                            style={{ backgroundImage: `url('${getBackdropUrl(item.Id)}')` }}
                        />
                        <div className="hero-overlay" />
                        <div className="hero-content">
                            {hasLogo ? (
                                <img src={getLogoUrl(item.Id)} className="hero-logo" alt={item.Name} />
                            ) : (
                                <h1 className="hero-title">{item.Name}</h1>
                            )}

                            <div className="hero-meta-line">
                                <span className="hero-badge-age">{item.OfficialRating || '13+'}</span>
                                {subDub && (
                                    <>
                                        <span className="hero-meta-divider">•</span>
                                        <span className="hero-meta-text">{subDub}</span>
                                    </>
                                )}
                                <span className="hero-meta-divider">•</span>
                                <span className="hero-meta-text">{item.Genres ? item.Genres.slice(0, 3).join(', ') : 'Anime'}</span>
                                {item.CommunityRating && (
                                    <>
                                        <span className="hero-meta-divider">•</span>
                                        <span className="hero-meta-text">⭐ {item.CommunityRating.toFixed(1)}</span>
                                    </>
                                )}
                                {endsAt}
                            </div>

                            <p className="hero-desc">{item.Overview}</p>

                            <div className="hero-actions">
                                <button className="btn-hero-primary" onClick={() => navigate(`/details/${item.Id}`)}>
                                    <i className="material-icons">play_arrow</i>
                                    <span>{btnText} <small>{btnSubText}</small></span>
                                </button>
                                <button
                                    className={`btn-hero-bookmark ${isFav ? 'active' : ''}`}
                                    onClick={(e) => toggleFav(e, item)}
                                >
                                    <span className={isFav ? "material-icons" : "material-icons-outlined"}>
                                        {isFav ? 'bookmark' : 'bookmark_border'}
                                    </span>
                                </button>
                                <button className="hero-button-info" onClick={() => onInfoClick(item.Id)} title="More Info">
                                    <span className="material-icons-outlined">info</span>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}

            <div className="hero-indicators">
                {items.map((_, index) => {
                    const isActive = index === currentIndex;
                    const isCompleted = index < currentIndex;
                    return (
                        <div
                            key={index}
                            className={`hero-indicator ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                            onClick={() => goToSlide(index)}
                        >
                            <div className="fill"></div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HeroCarousel;
