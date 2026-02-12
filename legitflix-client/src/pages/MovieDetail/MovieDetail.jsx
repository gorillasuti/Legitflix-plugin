import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import SubtitleModal from '../../components/SubtitleModal';
import { Button } from '@/components/ui/button';
import './MovieDetail.css';
import jellyfinService from '../../services/jellyfin';
// Footer removed as per SeriesDetail changes

const MovieDetail = () => {
    const { id } = useParams();
    const [movie, setMovie] = useState(null);
    const [similars, setSimilars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubtitleModalOpen, setIsSubtitleModalOpen] = useState(false);

    // UI States
    const [isDescExpanded, setIsDescExpanded] = useState(false);

    // Preferences
    const [audioPref, setAudioPref] = useState(localStorage.getItem('legitflix-audio-pref') || 'en');
    const [subPref, setSubPref] = useState(localStorage.getItem('legitflix-sub-pref') || 'en');
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

    // Trailer / Clean View States
    const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isCleanView, setIsCleanView] = useState(false);
    const [showTrailerHelp, setShowTrailerHelp] = useState(false);
    const [showBlockedModal, setShowBlockedModal] = useState(false);
    const [trailerKey, setTrailerKey] = useState(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isPlayed, setIsPlayed] = useState(false);

    const dropdownRef = useRef(null); // For generic dropdowns/season if needed, but not used here
    const langDropdownRef = useRef(null);
    const trailerHelpTimeout = useRef(null);
    const cleanViewTimeout = useRef(null);
    const trailerIframeRef = useRef(null);

    // Initial Data Load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const user = await jellyfinService.getCurrentUser();
                if (!user) return;

                // 1. Fetch Movie Details
                // Use getItemDetails or getItem. Series uses getSeries. Movies use getItem usually or getItemDetails.
                // SeriesDetail used jellyfinService.getSeries which calls userLibrary.getItem with specific fields.
                // We'll effectively do the same for Movie.
                const movieData = await jellyfinService.getItemDetails(user.Id, id);
                setMovie(movieData);
                setIsFavorite(movieData.UserData?.IsFavorite || false);
                setIsPlayed(movieData.UserData?.Played || false);

                // Extract trailer key (if exists)
                if (movieData.RemoteTrailers && movieData.RemoteTrailers.length > 0) {
                    const url = movieData.RemoteTrailers[0].Url;
                    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                    if (ytMatch && ytMatch[1]) {
                        setTrailerKey(ytMatch[1]);
                    }
                }

                // 2. Fetch Similar Items
                const similarData = await jellyfinService.getSimilarItems(user.Id, id);
                setSimilars(similarData.Items || []);

            } catch (error) {
                console.error("Failed to load movie data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    // Click outside handler for dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
                setIsLangDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePrefChange = (type, value) => {
        if (type === 'audio') {
            setAudioPref(value);
            localStorage.setItem('legitflix-audio-pref', value);
        } else {
            setSubPref(value);
            localStorage.setItem('legitflix-sub-pref', value);
        }
        setIsLangDropdownOpen(false);
    };

    const toggleFavorite = async () => {
        try {
            const user = await jellyfinService.getCurrentUser();
            const newFav = !isFavorite;
            await jellyfinService.markFavorite(user.Id, movie.Id, newFav);
            setIsFavorite(newFav);
        } catch (err) {
            console.error("Favorite toggle failed", err);
        }
    };

    const togglePlayed = async () => {
        try {
            const user = await jellyfinService.getCurrentUser();
            const newPlayed = !isPlayed;
            await jellyfinService.markPlayed(user.Id, movie.Id, newPlayed);
            setIsPlayed(newPlayed);
            // Update local state
            setMovie(prev => ({ ...prev, UserData: { ...prev.UserData, Played: newPlayed } }));
        } catch (err) {
            console.error("Played toggle failed", err);
        }
    };

    // Trailer Logic
    const toggleMute = () => {
        const newMute = !isMuted;
        setIsMuted(newMute);
        const action = newMute ? 'mute' : 'unMute';
        trailerIframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: action, args: [] }),
            '*'
        );
    };

    const startCleanViewTimer = () => {
        if (cleanViewTimeout.current) clearTimeout(cleanViewTimeout.current);
        cleanViewTimeout.current = setTimeout(() => {
            if (isTrailerPlaying) {
                setIsCleanView(true);
            }
        }, 5000);
    };

    const resetCleanViewTimer = () => {
        setIsCleanView(false);
        if (isTrailerPlaying) {
            startCleanViewTimer();
        }
    };

    const handleWatchTrailer = () => {
        if (isTrailerPlaying) {
            handleStopTrailer();
            return;
        }

        setIsTrailerPlaying(true);
        setIsCleanView(false);
        startCleanViewTimer();

        let receivedMessage = false;
        const messageHandler = (event) => {
            if (typeof event.data === 'string' && (event.data.includes('"event"') || event.data.includes('"id"'))) {
                receivedMessage = true;
                if (trailerHelpTimeout.current) clearTimeout(trailerHelpTimeout.current);
            }
        };
        window.addEventListener('message', messageHandler);
        window.lfMessageHandler = messageHandler;

        trailerHelpTimeout.current = setTimeout(() => {
            if (!receivedMessage && isTrailerPlaying) {
                console.log('Possible block detected: No YT API message received.');
                setShowTrailerHelp(true);
            }
        }, 4000);
    };

    const handleStopTrailer = () => {
        setIsTrailerPlaying(false);
        setIsCleanView(false);
        setShowTrailerHelp(false);
        setShowBlockedModal(false);
        setIsMuted(false);

        if (cleanViewTimeout.current) clearTimeout(cleanViewTimeout.current);
        if (trailerHelpTimeout.current) clearTimeout(trailerHelpTimeout.current);
        if (window.lfMessageHandler) {
            window.removeEventListener('message', window.lfMessageHandler);
            delete window.lfMessageHandler;
        }
    };

    // Clean up on unmount
    useEffect(() => {
        return () => {
            // Check if refs exist before accessing .current (React safety)
            // But for timeouts it's just ID.
            if (cleanViewTimeout.current) clearTimeout(cleanViewTimeout.current);
            if (trailerHelpTimeout.current) clearTimeout(trailerHelpTimeout.current);
            if (window.lfMessageHandler) window.removeEventListener('message', window.lfMessageHandler);
        };
    }, []);

    if (loading) return <div className="lf-movie-container" style={{ color: 'white' }}>Loading...</div>;
    if (!movie) return <div className="lf-movie-container" style={{ color: 'white' }}>Movie not found</div>;

    const backdropUrl = jellyfinService.getImageUrl(movie, 'Backdrop');
    const posterUrl = jellyfinService.getImageUrl(movie, 'Primary');
    const logoUrl = jellyfinService.getImageUrl(movie, 'Logo');

    // Cast processing: Take top 10
    const cast = movie.People ? movie.People.slice(0, 10) : [];

    // Dummy options
    const audioOptions = [{ code: 'en', name: 'English' }, { code: 'ja', name: 'Japanese' }];
    const subOptions = [{ code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }, { code: 'hu', name: 'Hungarian' }];

    const formatDuration = (ticks) => {
        if (!ticks) return '';
        const minutes = Math.floor(ticks / 600000000);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
    };

    return (
        <div className="lf-movie-container">
            <Navbar alwaysFilled={true} />

            {/* Hero Section */}
            <section
                className={`lf-movie-hero ${isCleanView ? 'is-clean-view' : ''}`}
                onMouseMove={resetCleanViewTimer}
                onClick={resetCleanViewTimer}
            >
                <div className={`lf-movie-hero__backdrop ${isTrailerPlaying ? 'is-hidden' : ''}`} style={{ backgroundImage: `url('${backdropUrl}')` }}></div>

                {/* Trailer Container */}
                <div className={`lf-movie-hero__trailer ${isTrailerPlaying ? 'is-playing' : ''}`}>
                    {isTrailerPlaying && trailerKey && (
                        <iframe
                            ref={trailerIframeRef}
                            src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=0&loop=1&modestbranding=1&rel=0&iv_load_policy=3&fs=0&color=white&controls=0&disablekb=1&playlist=${trailerKey}&enablejsapi=1&origin=${window.location.origin}&widget_referrer=${window.location.origin}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                            title="Trailer"
                        />
                    )}
                    {/* Help Button - Always show when playing */}
                    {isTrailerPlaying && (
                        <button
                            className="lf-trailer-help-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowBlockedModal(true);
                            }}
                        >
                            <span className="material-icons">help_outline</span>
                            <span>Trouble playing?</span>
                        </button>
                    )}
                </div>

                {/* Clean View Logo */}
                {logoUrl && (
                    <img
                        className="lf-movie-hero__logo"
                        src={logoUrl}
                        alt={movie.Name}
                    />
                )}

                <div className="lf-movie-hero__content">
                    <img className="lf-movie-hero__poster" src={posterUrl} alt={movie.Name} />

                    <div className="lf-movie-hero__info">
                        <h1 className="lf-movie-hero__title">{movie.Name}</h1>

                        <div className="lf-movie-hero__meta">
                            <span>{movie.ProductionYear}</span>
                            <span>•</span>
                            <span>{movie.OfficialRating}</span>
                            <span>•</span>
                            <span>{formatDuration(movie.RunTimeTicks)}</span>
                            <span>•</span>
                            <div className="lf-movie-hero__rating">
                                <span className="material-icons">star</span>
                                <span>{movie.CommunityRating ? movie.CommunityRating.toFixed(1) : ''}</span>
                            </div>
                        </div>

                        <div className="lf-movie-hero__details">
                            <div className="lf-movie-hero__description">
                                <p className={`lf-movie-hero__description-text ${isDescExpanded ? 'is-expanded' : ''}`}>
                                    {movie.Overview}
                                </p>
                                {movie.Overview && movie.Overview.length > 200 && (
                                    <button
                                        className={`lf-movie-hero__load-more ${isDescExpanded ? 'is-expanded' : ''}`}
                                        onClick={() => setIsDescExpanded(!isDescExpanded)}
                                    >
                                        {isDescExpanded ? 'Show Less' : 'Read More'}
                                        <span className="material-icons">expand_more</span>
                                    </button>
                                )}
                            </div>

                            {cast.length > 0 && (
                                <div className="lf-movie-hero__cast-info">
                                    <div style={{ marginBottom: 8 }}>
                                        <strong>Starring: </strong>
                                        {cast.slice(0, 3).map(p => p.Name).join(', ')}
                                        {cast.length > 3 && <span>...</span>}
                                    </div>
                                    <div>
                                        <strong>Genres: </strong>
                                        {movie.Genres ? movie.Genres.join(', ') : ''}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="lf-movie-hero__actions">
                            <button className="lf-btn lf-btn--primary lf-btn--ring-hover">
                                <span className="material-icons">play_arrow</span>
                                Start Watching
                            </button>
                            <button
                                className="lf-btn lf-btn--glass lf-btn--ring-hover-secondary"
                                onClick={handleWatchTrailer}
                                style={!trailerKey ? { opacity: 0.5, pointerEvents: 'none' } : {}}
                            >
                                <span className="material-icons">{isTrailerPlaying ? 'stop_circle' : 'theaters'}</span>
                                {isTrailerPlaying ? 'Stop Trailer' : 'Watch Trailer'}
                            </button>
                            {isTrailerPlaying && (
                                <button className={`lf-btn lf-btn--glass lf-btn--icon-only ${isMuted ? 'is-muted' : ''}`} onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}>
                                    <span className="material-icons">{isMuted ? 'volume_off' : 'volume_up'}</span>
                                </button>
                            )}
                            <button
                                className={`lf-btn lf-btn--glass lf-btn--icon-only ${isFavorite ? 'is-active' : ''}`}
                                onClick={toggleFavorite}
                                title="Add to List"
                            >
                                <span className="material-icons">{isFavorite ? 'bookmark' : 'bookmark_border'}</span>
                            </button>
                            <button
                                className="lf-btn lf-btn--glass lf-btn--icon-only"
                                onClick={() => setIsSubtitleModalOpen(true)}
                                title="Edit Subtitles"
                            >
                                <span className="material-icons">subtitles</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <hr className="lf-section-divider" />

            {/* PLAYER SECTION (Replaces Episodes) */}
            <div className="lf-content-section" id="lfDirectPlayer">
                {/* Header for Player Section - similar to Episode Header but simplified */}
                <div className="lf-section-header">
                    <h2 className="lf-section-title">{movie.Name}</h2>

                    {/* Filter Controls (Audio/Subs and Mark Watched) */}
                    <div className="lf-filter-controls">
                        {/* Audio & Subs Dropdown */}
                        <div className={`lf-filter-dropdown ${isLangDropdownOpen ? 'is-open' : ''}`} ref={langDropdownRef}>
                            <button
                                className="lf-filter-btn"
                                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                                title="Audio & Subtitles"
                            >
                                <span className="material-icons">subtitles</span>
                                <span>Audio & Subs</span>
                                <span className="material-icons">expand_more</span>
                            </button>
                            {/* Dropdown Menu - Simplified for readability here, reusing same structure */}
                            <div className="lf-filter-dropdown__menu lf-lang-menu">
                                <div className="lf-lang-section">
                                    <div className="lf-dropdown-section-title">Audio</div>
                                    {audioOptions.map(opt => (
                                        <div
                                            key={opt.code}
                                            className={`lf-filter-dropdown__option ${audioPref === opt.code ? 'is-selected' : ''}`}
                                            onClick={() => handlePrefChange('audio', opt.code)}
                                        >
                                            <span>{opt.name}</span>
                                            {audioPref === opt.code && <span className="material-icons">check</span>}
                                        </div>
                                    ))}
                                </div>
                                <div className="lf-lang-separator"></div>
                                <div className="lf-lang-section">
                                    <div className="lf-dropdown-section-title">Subtitles</div>
                                    {subOptions.map(opt => (
                                        <div
                                            key={opt.code}
                                            className={`lf-filter-dropdown__option ${subPref === opt.code ? 'is-selected' : ''}`}
                                            onClick={() => handlePrefChange('sub', opt.code)}
                                        >
                                            <span>{opt.name}</span>
                                            {subPref === opt.code && <span className="material-icons">check</span>}
                                        </div>
                                    ))}
                                </div>
                                <div className="lf-lang-footer">
                                    <button
                                        className="lf-edit-subs-btn"
                                        onClick={() => {
                                            setIsLangDropdownOpen(false);
                                            setIsSubtitleModalOpen(true);
                                        }}
                                    >
                                        <span className="material-icons">edit</span>
                                        <span>Edit Subtitles</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Mark Watched Toggle (Replaces Bulk Edit) */}
                        <button
                            className="lf-filter-btn"
                            onClick={togglePlayed}
                            title={isPlayed ? "Mark as Unwatched" : "Mark as Watched"}
                        >
                            <span className="material-icons">{isPlayed ? 'visibility_off' : 'visibility'}</span>
                            <span>{isPlayed ? 'Mark Unwatched' : 'Mark Watched'}</span>
                        </button>
                    </div>
                </div>

                <div className="lf-movie-player-main">
                    <div className="lf-movie-player-placeholder">
                        <span className="material-icons" style={{ fontSize: '64px', opacity: 0.5 }}>play_circle_outline</span>
                        <p style={{ marginTop: '10px', fontWeight: 500 }}>Click 'Start Watching' to play movie</p>
                    </div>
                </div>
            </div>

            <hr className="lf-section-divider" />

            {/* Cast & Crew Section */}
            {cast.length > 0 && (
                <div className="lf-content-section">
                    <h2 className="lf-section-title">Cast & Crew</h2>
                    <div className="lf-cast-grid">
                        {cast.map(person => (
                            <div key={person.Id || person.Name} className="lf-cast-card">
                                <img
                                    src={jellyfinService.getImageUrl(person, 'Primary') || 'https://via.placeholder.com/80x80?text=?'}
                                    alt={person.Name}
                                    className="lf-cast-card__image"
                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/80x80?text=?' }}
                                />
                                <div className="lf-cast-card__name">{person.Name}</div>
                                <div className="lf-cast-card__role">{person.Role}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <hr className="lf-section-divider" />

            {/* More Like This Section */}
            {similars.length > 0 && (
                <div className="lf-content-section" style={{ marginBottom: 40 }}>
                    <h2 className="lf-section-title">More Like This</h2>
                    <div className="lf-similar-grid">
                        {similars.map(item => (
                            <Link to={`/movie/${item.Id}`} key={item.Id} className="lf-similar-card">
                                <img
                                    className="lf-similar-card__poster"
                                    src={jellyfinService.getImageUrl(item, 'Primary')}
                                    alt={item.Name}
                                    loading="lazy"
                                />
                                <div className="lf-similar-card__title">{item.Name}</div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <SubtitleModal
                isOpen={isSubtitleModalOpen}
                onClose={() => setIsSubtitleModalOpen(false)}
                seriesId={movie ? movie.Id : ''}
                initialSeasonId={null}
                initialEpisodeId={movie ? movie.Id : ''}
                isMovie={true}
            />

            {/* Blocked Modal */}
            {showBlockedModal && (
                <div className="lf-blocked-modal-overlay">
                    <div className="lf-blocked-modal">
                        <span className="material-icons lf-blocked-icon">block</span>
                        <h3>Content blocked by browser</h3>
                        <p>The trailer cannot be played because your browser blocked it. This usually happens due to tracking protection or ad blockers affecting the YouTube player.</p>
                        <button
                            className="lf-btn lf-btn--primary"
                            onClick={() => {
                                setShowBlockedModal(false);
                                handleStopTrailer();
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieDetail;
