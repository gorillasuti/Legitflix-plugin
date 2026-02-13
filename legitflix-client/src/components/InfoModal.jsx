
import React, { useState, useEffect, useCallback } from 'react';
import { jellyfinService } from '../services/jellyfin';
import { Button } from '@/components/ui/button';
import './InfoModal.css';

const InfoModal = ({ itemId, onClose, isOpen }) => {
    const [details, setDetails] = useState(null);
    const [trailers, setTrailers] = useState([]);
    const [activeTrailerId, setActiveTrailerId] = useState(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isIdle, setIsIdle] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [userId, setUserId] = useState(null);

    // Fetch Details on Open
    // Fetch Details on Open
    useEffect(() => {
        if (!isOpen || !itemId) return;

        // Reset state
        setIsVisible(false);
        setDetails(null);
        setTrailers([]);
        setActiveTrailerId(null);

        const fetchData = async () => {
            // Delay visibility slightly to allow mount
            setTimeout(() => setIsVisible(true), 10);

            const user = await jellyfinService.getCurrentUser();
            // --- HELPER FUNCTIONS ---
            const getYoutubeId = (url) => {
                if (!url) return null;
                if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
                if (url.includes('youtu.be/')) return url.split('youtu.be/')[1].split('?')[0];
                if (url.includes('embed/')) return url.split('embed/')[1].split('?')[0];
                return null;
            };
            if (user) {
                setUserId(user.Id);
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

                // 3. Local Trailers
                if (data.LocalTrailers) {
                    data.LocalTrailers.forEach(t => {
                        foundTrailers.push({
                            title: t.Name || 'Local Trailer',
                            id: t.Id,
                            type: 'Local'
                        });
                    });
                }

                setTrailers(foundTrailers);
                if (foundTrailers.length > 0) {
                    // Default to first trailer
                    setActiveTrailerId(foundTrailers[0].id);
                } else if (data.Type === 'Series' || data.Type === 'Movie') {
                    // FALLBACK: If no trailers found, add a Search Trailer
                    const fallbackId = `${data.Name} ${data.ProductionYear || ''} Trailer`;
                    const fallbackTrailer = {
                        title: 'Search YouTube',
                        id: fallbackId,
                        type: 'Search'
                    };
                    setTrailers([fallbackTrailer]);
                    setActiveTrailerId(fallbackId);
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

    const toggleFavorite = async () => {
        if (!userId || !details) return;
        const newFav = !details.UserData?.IsFavorite;
        // Optimistic update
        setDetails(prev => ({
            ...prev,
            UserData: { ...prev.UserData, IsFavorite: newFav }
        }));
        try {
            await jellyfinService.markFavorite(userId, details.Id, newFav);
        } catch (err) {
            // Revert on failure
            setDetails(prev => ({
                ...prev,
                UserData: { ...prev.UserData, IsFavorite: !newFav }
            }));
        }
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
    const activeTrailer = trailers.find(t => t.id === activeTrailerId);
    let trailerUrl = null;
    let isLocalTrailer = false;

    if (activeTrailer) {
        if (activeTrailer.type === 'Local') {
            isLocalTrailer = true;
            // Native Stream
            trailerUrl = `${jellyfinService.api.basePath}/Videos/${activeTrailer.id}/stream?Container=mp4&Static=true&api_key=${jellyfinService.api.accessToken}`;
        } else if (activeTrailer.type === 'Search') {
            // YouTube Search List
            // listType=search&list=QUERY
            trailerUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(activeTrailer.id)}&autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1`;
        } else {
            // YouTube ID
            trailerUrl = `https://www.youtube.com/embed/${activeTrailer.id}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1&playlist=${activeTrailer.id}&enablejsapi=1`;
        }
    }

    return (
        <div className={`legitflix-info-modal ${isVisible ? 'visible' : ''}`}>
            <div className="info-modal-backdrop" onClick={onClose}></div>

            <div className="info-modal-content">
                <Button
                    variant="ghost"
                    size="icon"
                    className="btn-close-modal absolute top-5 right-5 z-50 rounded-full bg-black/50 text-white hover:bg-white/20"
                    onClick={onClose}
                >
                    <span className="material-icons">close</span>
                </Button>

                {/* VIDEO HERO */}
                <div className="info-video-container">
                    <div className="iframe-wrapper">
                        {trailerUrl ? (
                            isLocalTrailer ? (
                                <video
                                    className="info-video-iframe"
                                    src={trailerUrl}
                                    autoPlay
                                    muted={isMuted}
                                    loop
                                    playsInline
                                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                />
                            ) : (
                                <iframe
                                    className="info-video-iframe"
                                    src={trailerUrl}
                                    title="Trailer"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                />
                            )
                        ) : (
                            <div className="info-backdrop-fallback" style={{ backgroundImage: `url('${backdropUrl}')` }}></div>
                        )}
                    </div>

                    <div className="video-overlay-gradient"></div>

                    {/* Mute Button */}
                    {trailerUrl && (
                        <div className="video-mute-overlay">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full w-10 h-10 border border-white/30 bg-black/30 hover:bg-white/10 text-white"
                                onClick={toggleMute}
                            >
                                <span className="material-icons text-lg">{isMuted ? 'volume_off' : 'volume_up'}</span>
                            </Button>
                        </div>
                    )}

                    {/* Content Overlay */}
                    <div className={`info-hero-content ${isIdle ? 'idle' : ''}`}>
                        {logoUrl ? <img src={logoUrl} className="info-logo" alt={details.Name} /> : <h1 className="info-title-text">{details.Name}</h1>}

                        <div className="info-actions flex gap-4 mt-6">
                            <Button
                                variant="ringHover"
                                size="lg"
                                className="h-12 px-8 text-lg font-bold rounded-md gap-2"
                                onClick={handlePlay}
                            >
                                <span className="material-icons">play_arrow</span> Play
                            </Button>

                            <Button
                                variant="outline"
                                size="lg"
                                className={`h-12 px-6 text-lg rounded-md gap-2 border-2 bg-transparent hover:bg-white/10 ${details.UserData?.IsFavorite ? 'border-primary text-primary' : 'border-white/40 text-white'}`}
                                onClick={toggleFavorite}
                            >
                                <span className="material-icons">{details.UserData?.IsFavorite ? 'check' : 'add'}</span> My List
                            </Button>
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
                <div className="info-trailers-section">
                    <h3>Trailers & More</h3>
                    <div className="trailers-grid">
                        {trailers.map(t => (
                            <div key={t.id} className="trailer-card" onClick={() => setActiveTrailerId(t.id)}>
                                <div className="trailer-thumb">
                                    {t.type === 'Local' ? (
                                        <div className="local-trailer-placeholder">
                                            <span className="material-icons">movie</span>
                                        </div>
                                    ) : (
                                        <img src={`https://img.youtube.com/vi/${t.id}/mqdefault.jpg`} alt={t.title} loading="lazy" />
                                    )}
                                    <div className="play-overlay"><span className="material-icons">play_circle_outline</span></div>
                                </div>
                                <div className="trailer-title">{t.title}</div>
                            </div>
                        ))}

                        {/* Search on YouTube Fallback */}
                        <a
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(details.Name + ' ' + (details.ProductionYear || '') + ' trailer')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="trailer-card search-card"
                        >
                            <div className="trailer-thumb search-thumb">
                                <span className="material-icons">search</span>
                            </div>
                            <div className="trailer-title">Search YouTube</div>
                        </a>
                    </div>
                </div>

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
