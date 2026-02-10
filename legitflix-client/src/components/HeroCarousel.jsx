import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../services/jellyfin';
import { useTheme } from '../context/ThemeContext';
import './HeroCarousel.css';

const HeroCarousel = () => {
    const { config } = useTheme();
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const intervalRef = useRef(null);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                if (!user) {
                    console.error("No user found for HeroCarousel");
                    setLoading(false);
                    return;
                }

                const query = {
                    includeItemTypes: config.heroMediaTypes,
                    recursive: true,
                    sortBy: 'DateCreated',
                    sortOrder: 'Descending',
                    limit: config.heroLimit,
                    fields: ['PrimaryImageAspectRatio', 'Overview', 'ProductionYear', 'OfficialRating', 'CommunityRating', 'RunTimeTicks', 'Genres', 'MediaStreams', 'UserData', 'ImageTags', 'BackdropImageTags'],
                    imageTypeLimit: 1,
                    enableImageTypes: ['Backdrop', 'Primary', 'Logo']
                };

                const response = await jellyfinService.getItems(user.Id, query);
                let fetchedItems = response.data.Items || [];

                // Filter items that actually have backdrops
                fetchedItems = fetchedItems.filter(i => i.BackdropImageTags && i.BackdropImageTags.length > 0);

                // Slice based on original logic (skip first 3? or just show top?)
                // Original logic: items.slice(3, 9). Let's just show top 5 for now.
                const validItems = fetchedItems.slice(0, 5);

                // Fetch Next Up for Series
                for (const item of validItems) {
                    if (item.Type === 'Series') {
                        try {
                            const nextUp = await jellyfinService.getNextUp(user.Id, item.Id);
                            if (nextUp.data.Items && nextUp.data.Items.length > 0) {
                                item._nextUp = nextUp.data.Items[0];
                            }
                        } catch (e) {
                            console.warn('Failed to fetch Next Up', e);
                        }
                    }
                }

                setItems(validItems);
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
    };

    useEffect(() => {
        if (items.length > 0) {
            resetTimer();
        }
        return () => clearInterval(intervalRef.current);
    }, [items]);


    if (loading) return null; // Skeleton should be handled by parent or this could return it
    if (items.length === 0) return null;

    const currentItem = items[currentIndex];

    // Helper for Image URLs
    const getBackdropUrl = (id) => `/Items/${id}/Images/Backdrop/0?maxHeight=1080&quality=96`;
    const getLogoUrl = (id) => `/Items/${id}/Images/Logo?maxHeight=200&maxWidth=450&quality=90`;

    // Metadata Logic
    const hasLogo = currentItem.ImageTags && currentItem.ImageTags.Logo;
    const title = currentItem.Name;
    const desc = currentItem.Overview;
    const rating = currentItem.OfficialRating || '13+';
    const genres = currentItem.Genres ? currentItem.Genres.slice(0, 3).join(', ') : '';

    // Next Up / Play Button Logic
    let btnText = 'START WATCHING';
    let btnSubText = '';
    let actionId = currentItem.Id;

    if (currentItem.Type === 'Series') {
        if (currentItem._nextUp) {
            const s = currentItem._nextUp.ParentIndexNumber;
            const e = currentItem._nextUp.IndexNumber;
            btnText = 'CONTINUE';
            btnSubText = `S${s} E${e}`;
            actionId = currentItem._nextUp.Id;
        } else {
            btnSubText = 'S1 E1';
        }
    } else {
        // Resume logic for movies could go here using UserData
        if (currentItem.UserData && currentItem.UserData.PlaybackPositionTicks > 0) {
            const pct = Math.round((currentItem.UserData.PlaybackPositionTicks / currentItem.RunTimeTicks) * 100);
            if (pct > 2 && pct < 90) {
                btnText = 'CONTINUE';
                btnSubText = `${pct}%`;
            }
        }
    }

    const handlePlay = () => {
        // For now, valid routing to detail page or play
        // Using window navigation for compatibility with existing theme logic if mixed?
        // Or routing within React.
        // Let's route to detail for now.
        // window.location.hash = `/details/${currentItem.Id}`;
        navigate(`/details/${currentItem.Id}`);
    };

    return (
        <div className="hero-carousel-container">
            {items.map((item, index) => (
                <div
                    key={item.Id}
                    className={`hero-slide ${index === currentIndex ? 'active' : ''}`}
                >
                    <div
                        className="hero-backdrop"
                        style={{ backgroundImage: `url('${getBackdropUrl(item.Id)}')` }}
                    />
                    <div className="hero-overlay" />
                    <div className="hero-content">
                        {hasLogo && item.ImageTags.Logo ? (
                            <img src={getLogoUrl(item.Id)} className="hero-logo" alt={item.Name} />
                        ) : (
                            <h1 className="hero-title">{item.Name}</h1>
                        )}

                        <div className="hero-meta-line">
                            <span className="hero-badge-age">{rating}</span>
                            <span className="hero-meta-divider">•</span>
                            <span className="hero-meta-text">{genres}</span>
                        </div>

                        <p className="hero-desc">{item.Overview}</p>

                        <div className="hero-actions">
                            <button className="btn-hero-primary" onClick={handlePlay}>
                                <i className="material-icons">play_arrow</i>
                                <span>{btnText} <small>{btnSubText}</small></span>
                            </button>
                            <button className="btn-hero-bookmark">
                                <span className="material-icons-outlined">bookmark_border</span>
                            </button>
                            <button className="hero-button-info" onClick={() => navigate(`/details/${item.Id}`)}>
                                <span className="material-icons-outlined">info</span>
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            <div className="hero-indicators">
                {items.map((_, index) => (
                    <div
                        key={index}
                        className={`hero-indicator ${index === currentIndex ? 'active' : ''}`}
                        onClick={() => goToSlide(index)}
                    >
                        <div className="fill"></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HeroCarousel;
