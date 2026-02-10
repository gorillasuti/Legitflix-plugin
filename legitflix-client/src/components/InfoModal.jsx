
import React, { useState, useEffect, useCallback } from 'react';
import { jellyfinService } from '../services/jellyfin';
import './InfoModal.css';

const InfoModal = ({ itemId, onClose, isOpen }) => {
    const [details, setDetails] = useState(null);
    const [trailers, setTrailers] = useState([]);
    const [activeTrailerId, setActiveTrailerId] = useState(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isIdle, setIsIdle] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Fetch Details on Open
    useEffect(() => {
        if (!isOpen || !itemId) return;

        const fetchData = async () => {
            setIsVisible(true);
            const user = await jellyfinService.getCurrentUser();
            if (user) {
                const data = await jellyfinService.getItemDetails(user.Id, itemId);
                setDetails(data);

                // --- TRAILER LOGIC ---
                const foundTrailers = [];
                // 1. Remote Trailers
                if (data.RemoteTrailers) {
                    data.RemoteTrailers.forEach(t => {
                        const vid = getYoutubeId(t.Url);
                        if (vid) foundTrailers.push({ title: 'Main Trailer', id: vid, type: 'Movie' });
                    });
                }
                // 2. Season Trailers (if Series)
                if (data.Type === 'Series') {
                    const seasons = await jellyfinService.getSeasons(user.Id, itemId);
                    seasons.forEach(s => {
                        if (s.RemoteTrailers) {
                            s.RemoteTrailers.forEach(t => {
                                const vid = getYoutubeId(t.Url);
                                if (vid) foundTrailers.push({ title: s.Name, id: vid });
                            });
                        }
                    });
                }

                setTrailers(foundTrailers);
                if (foundTrailers.length > 0) {
                    // Default to first trailer
                    setActiveTrailerId(foundTrailers[0].id);
                }
            }
        };
        fetchData();

        // Lock Body Scroll
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = '';
            setDetails(null);
            setTrailers([]);
            setActiveTrailerId(null);
            setIsVisible(false);
        }

    }, [isOpen, itemId]);

    // Idle Timer (Hide UI)
    useEffect(() => {
        let timer;
        const resetIdle = () => {
            setIsIdle(false);
            clearTimeout(timer);
            timer = setTimeout(() => setIsIdle(true), 5000);
        };

        window.addEventListener('mousemove', resetIdle);
        window.addEventListener('click', resetIdle);
        resetIdle();

        return () => {
            window.removeEventListener('mousemove', resetIdle);
            window.removeEventListener('click', resetIdle);
            clearTimeout(timer);
        }
    }, [isOpen]);


    if (!isOpen || !details) return null;

    // --- HELPER FUNCTIONS ---
    const getYoutubeId = (url) => {
        if (!url) return null;
        if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
        if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
        if (url.includes('embed/')) return url.split('embed/')[1].split('?')[0];
        return null;
    };

    const handlePlay = () => {
        // Basic Navigation Fallback for now
        window.location.href = `#!/details?id=${details.Id}`;
        // In real app, trigger playback manager
    }

    const toggleMute = () => {
        setIsMuted(!isMuted);
        // Note: React re-render will update iframe src params, reusing iframe
        // Ideally we use postMessage but iframe re-render is "good enough" for MVP
    };

    // --- RENDER ---
    const backdropUrl = `${jellyfinService.api.basePath}/Items/${details.Id}/Images/Backdrop/0?quality=90&maxWidth=1920`;
    const logoUrl = details.ImageTags && details.ImageTags.Logo
        ? `${jellyfinService.api.basePath}/Items/${details.Id}/Images/Logo?maxHeight=140&maxWidth=400&quality=90`
        : null;

    // Trailer URL construction
    const trailerUrl = activeTrailerId
        ? `https://www.youtube.com/embed/${activeTrailerId}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1&playlist=${activeTrailerId}&enablejsapi=1`
        : null;

    return (
        <div className={`legitflix-info-modal ${isVisible ? 'visible' : ''}`}>
            <div className="info-modal-backdrop" onClick={onClose}></div>

            <div className="info-modal-content">
                <button className="btn-close-modal" onClick={onClose}>
                    <span className="material-icons">close</span>
                </button>

                {/* VIDEO HERO */}
                <div className="info-video-container">
                    <div className="iframe-wrapper">
                        {trailerUrl ? (
                            <iframe
                                className="info-video-iframe"
                                src={trailerUrl}
                                title="Trailer"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            />
                        ) : (
                            <div className="info-backdrop-fallback" style={{ backgroundImage: `url('${backdropUrl}')` }}></div>
                        )}
                    </div>

                    <div className="video-overlay-gradient"></div>

                    {/* Mute Button */}
                    {trailerUrl && (
                        <div className="video-mute-overlay">
                            <button className="btn-mute-toggle" onClick={toggleMute}>
                                <span className="material-icons">{isMuted ? 'volume_off' : 'volume_up'}</span>
                            </button>
                        </div>
                    )}

                    {/* Content Overlay */}
                    <div className={`info-hero-content ${isIdle ? 'idle' : ''}`}>
                        {logoUrl ? <img src={logoUrl} className="info-logo" alt={details.Name} /> : <h1 className="info-title-text">{details.Name}</h1>}

                        <div className="info-actions">
                            <button className="btn-play-hero" onClick={handlePlay}>
                                <span className="material-icons">play_arrow</span> Play
                            </button>
                            <button className="btn-my-list" onClick={() => jellyfinService.markFavorite(details.UserData.UserId, details.Id, !details.UserData.IsFavorite)}>
                                <span className="material-icons">{details.UserData?.IsFavorite ? 'check' : 'add'}</span> My List
                            </button>
                        </div>
                    </div>
                </div>

                {/* DETAILS */}
                <div className="info-details-container">
                    <div className="info-col-left">
                        <div className="info-meta-row">
                            <span className="info-year">{details.ProductionYear}</span>
                            {details.OfficialRating && <span className="info-rating">{details.OfficialRating}</span>}
                            <span className="info-duration">{details.RunTimeTicks ? Math.round(details.RunTimeTicks / 600000000) + 'm' : ''}</span>
                            <span className="info-quality">HD</span>
                        </div>
                        <p className="info-desc">{details.Overview || 'No description available.'}</p>
                    </div>
                </div>

                {/* TRAILERS GRID */}
                {trailers.length > 0 && (
                    <div className="info-trailers-section">
                        <h3>Trailers & More</h3>
                        <div className="trailers-grid">
                            {trailers.map(t => (
                                <div key={t.id} className="trailer-card" onClick={() => setActiveTrailerId(t.id)}>
                                    <div className="trailer-thumb">
                                        <img src={`https://img.youtube.com/vi/${t.id}/mqdefault.jpg`} alt={t.title} loading="lazy" />
                                        <div className="play-overlay"><span className="material-icons">play_circle_outline</span></div>
                                    </div>
                                    <div className="trailer-title">{t.title}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABOUT SECTION */}
                <div className="info-about-section">
                    <h3>About {details.Name}</h3>
                    {details.People && (
                        <div className="about-row">
                            <span className="label">Cast: </span>
                            <span className="value">{details.People.slice(0, 10).map(p => p.Name).join(', ')}</span>
                        </div>
                    )}
                    {details.Genres && (
                        <div className="about-row">
                            <span className="label">Genres: </span>
                            <span className="value">{details.Genres.join(', ')}</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default InfoModal;
