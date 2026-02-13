import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../services/jellyfin';
import { useTheme } from '../context/ThemeContext';
import SkeletonLoader from './SkeletonLoader';
import { Button } from '@/components/ui/button';
import './HeroCarousel.css';

const HeroCarousel = ({ onInfoClick }) => {
    const { config } = useTheme();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [fillKey, setFillKey] = useState(0);
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

                const sortMode = config.contentSortMode || 'latest';
                const sortMap = {
                    latest: { sortBy: 'DateCreated', sortOrder: 'Descending' },
                    random: { sortBy: 'Random', sortOrder: 'Descending' },
                    topRated: { sortBy: 'CommunityRating', sortOrder: 'Descending' },
                };
                const { sortBy, sortOrder } = sortMap[sortMode] || sortMap.latest;

                const query = {
                    includeItemTypes: config.heroMediaTypes,
                    recursive: true,
                    sortBy,
                    sortOrder,
                    limit: 20,
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
        setFillKey(k => k + 1);
    };

    const goToSlide = (index) => {
        setCurrentIndex(index);
        setFillKey(k => k + 1);
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
        e.stopPropagation();
        if (!item || !item.UserData) return;

        const originalState = item.UserData.IsFavorite;
        const newState = !originalState;

        // Optimistic UI Update
        setItems(prevItems => prevItems.map(i =>
            i.Id === item.Id
                ? { ...i, UserData: { ...i.UserData, IsFavorite: newState } }
                : i
        ));

        try {
            const user = await jellyfinService.getCurrentUser();
            if (user) {
                await jellyfinService.markFavorite(user.Id, item.Id, newState);
            }
        } catch (err) {
            console.error("Failed to toggle favorite", err);
            // Revert on failure
            setItems(prevItems => prevItems.map(i =>
                i.Id === item.Id
                    ? { ...i, UserData: { ...i.UserData, IsFavorite: originalState } }
                    : i
            ));
        }
    };

    const handlePlay = (e, item) => {
        e.stopPropagation();
        if (item.Type === 'Series') {
            if (item._nextUp) {
                // Play next up episode
                navigate(`/play/${item._nextUp.Id}`);
            } else {
                // No next up found? Go to series page or play first episode?
                // Safest to go to series page
                navigate(`/series/${item.Id}`);
            }
        } else if (item.Type === 'Movie') {
            navigate(`/movie/${item.Id}`, { state: { autoplay: true } });
        } else if (item.Type === 'Episode') {
            navigate(`/play/${item.Id}`);
        } else {
            // Fallback
            navigate(`/item/${item.Id}`);
        }
    };


    if (loading) {
        return (
            <div className="hero-carousel-container" style={{ height: '90vh', background: '#111', position: 'relative' }}>
                <SkeletonLoader width="100%" height="100%" />
                <div style={{
                    position: 'absolute',
                    top: '42.5%',
                    left: '4%',
                    transform: 'translateY(-50%)',
                    width: '40%',
                    maxWidth: '600px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.25rem'
                }}>
                    {/* Title or Logo */}
                    <SkeletonLoader width="70%" height="60px" style={{ marginBottom: '0' }} />

                    {/* Meta Line */}
                    <SkeletonLoader width="40%" height="24px" />

                    {/* Description */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <SkeletonLoader width="100%" height="18px" />
                        <SkeletonLoader width="95%" height="18px" />
                        <SkeletonLoader width="60%" height="18px" />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '0.5rem' }}>
                        <SkeletonLoader width="160px" height="46px" style={{ borderRadius: '50px' }} />
                        <SkeletonLoader width="42px" height="42px" style={{ borderRadius: '50%' }} />
                        <SkeletonLoader width="42px" height="42px" style={{ borderRadius: '50%' }} />
                    </div>
                </div>
            </div>
        );
    }
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

                            <div className="hero-actions flex gap-3 items-center">
                                <Button
                                    variant="ringHover"
                                    onClick={(e) => handlePlay(e, item)}
                                >
                                    <i className="material-icons">play_arrow</i>
                                    <span>{btnText} <small className="text-sm ml-1">{btnSubText}</small></span>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    className={`rounded-full w-12 h-12 border-2 border-white/20 bg-black/40 hover:bg-white/10 hover:border-white ${isFav ? 'text-primary' : 'text-white'}`}
                                    onClick={(e) => toggleFav(e, item)}
                                >
                                    <span className={isFav ? "material-icons" : "material-icons-outlined"} style={{ color: isFav ? 'var(--primary-color, #e50914)' : 'inherit' }}>
                                        {isFav ? 'bookmark' : 'bookmark_border'}
                                    </span>
                                </Button>

                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="rounded-full w-12 h-12 border-2 border-white/20 bg-black/40 hover:bg-white/10 hover:border-white text-white"
                                    onClick={(e) => { e.stopPropagation(); onInfoClick(item.Id); }}
                                    title="More Info"
                                >
                                    <span className="material-icons-outlined">info</span>
                                </Button>
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
                            <div className="fill" key={`fill-${index}-${isActive ? fillKey : 'inactive'}`}></div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HeroCarousel;
