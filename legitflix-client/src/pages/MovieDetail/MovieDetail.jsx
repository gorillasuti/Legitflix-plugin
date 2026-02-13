import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import SubtitleModal from '../../components/SubtitleModal';
import { Button } from '@/components/ui/button';
import './MovieDetail.css';
import SkeletonLoader from '../../components/SkeletonLoader';
import jellyfinService from '../../services/jellyfin';
import Footer from '../../components/Footer';
import MoviePlayer from './MoviePlayer';

const MovieDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
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
    const [isCleanView, setIsCleanView] = useState(false);
    const [showTrailerHelp, setShowTrailerHelp] = useState(false);
    const [showBlockedModal, setShowBlockedModal] = useState(false);
    const [trailerKey, setTrailerKey] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isPlayed, setIsPlayed] = useState(false);

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

    // Handle Auto-Play / Scroll from Navigation State
    const location = useLocation();
    useEffect(() => {
        if (location.state?.autoplay && !loading && movie) {
            scrollToPlayer();
        }
    }, [location.state, loading, movie]);


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
        // postMessage to YT player
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
        setIsCleanView(false); // Reset clean view start state
        startCleanViewTimer();

        // YouTube Blocking Detection
        let receivedMessage = false;
        const messageHandler = (event) => {
            if (typeof event.data === 'string' && (event.data.includes('"event"') || event.data.includes('"id"'))) {
                receivedMessage = true;
                if (trailerHelpTimeout.current) clearTimeout(trailerHelpTimeout.current);
            }
        };
        window.addEventListener('message', messageHandler);

        // Store handler to remove later if needed (though we rely on state reset)
        window.lfMessageHandler = messageHandler;

        // Auto-show help if no message received (but we now always show the button too)
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
        setIsMuted(false); // Reset mute on stop

        if (cleanViewTimeout.current) {
            clearTimeout(cleanViewTimeout.current);
            cleanViewTimeout.current = null;
        }
        if (trailerHelpTimeout.current) {
            clearTimeout(trailerHelpTimeout.current);
            trailerHelpTimeout.current = null;
        }

        if (window.lfMessageHandler) {
            window.removeEventListener('message', window.lfMessageHandler);
            delete window.lfMessageHandler;
        }
    };

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (cleanViewTimeout.current) clearTimeout(cleanViewTimeout.current);
            if (trailerHelpTimeout.current) clearTimeout(trailerHelpTimeout.current);
            if (window.lfMessageHandler) window.removeEventListener('message', window.lfMessageHandler);
        };
    }, []);

    // Skeleton Loader
    if (loading) {
        return (
            <div className="lf-movie-container">
                <Navbar alwaysFilled={true} />
                <section className="lf-movie-hero">
                    <div className="lf-movie-hero__backdrop" style={{ background: '#141414' }}></div>
                    <div className="lf-movie-hero__content">
                        <div className="lf-movie-hero__poster">
                            <SkeletonLoader type="rect" width="100%" height="100%" style={{ aspectRatio: '2/3', borderRadius: '8px' }} />
                        </div>

                        <div className="lf-movie-hero__info">
                            <h1 className="lf-movie-hero__title" style={{ marginBottom: '1rem' }}>
                                <SkeletonLoader type="text" width="60%" height="3rem" />
                            </h1>

                            <div className="lf-movie-hero__meta" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <SkeletonLoader type="text" width="60px" />
                                <SkeletonLoader type="text" width="40px" />
                                <SkeletonLoader type="text" width="80px" />
                            </div>

                            <div className="lf-movie-hero__details">
                                <div className="lf-movie-hero__description">
                                    <SkeletonLoader type="text" width="100%" />
                                    <SkeletonLoader type="text" width="95%" />
                                    <SkeletonLoader type="text" width="90%" />
                                </div>

                                <div className="lf-movie-hero__cast-info" style={{ marginTop: '1rem' }}>
                                    <SkeletonLoader type="text" width="80%" />
                                    <SkeletonLoader type="text" width="70%" />
                                </div>
                            </div>

                            <div className="lf-movie-hero__actions" style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                <SkeletonLoader type="rect" width="180px" height="48px" style={{ borderRadius: '24px' }} />
                                <SkeletonLoader type="rect" width="160px" height="48px" style={{ borderRadius: '24px' }} />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }
    if (!movie) return <div className="lf-movie-container" style={{ color: 'white' }}>Movie not found</div>;

    const backdropUrl = jellyfinService.getImageUrl(movie, 'Backdrop');
    const posterUrl = jellyfinService.getImageUrl(movie, 'Primary');
    const logoUrl = jellyfinService.getImageUrl(movie, 'Logo');

    // Cast processing: Take top 10
    const cast = movie.People ? movie.People.slice(0, 10) : [];

    // Dummy languages for selector (In real app, we'd scan available streams from first ep)
    const audioOptions = [{ code: 'en', name: 'English' }, { code: 'ja', name: 'Japanese' }];
    const subOptions = [{ code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }, { code: 'hu', name: 'Hungarian' }];

    const formatDuration = (ticks) => {
        if (!ticks) return '';
        const minutes = Math.floor(ticks / 600000000);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
    };

    const scrollToPlayer = () => {
        const playerSection = document.querySelector('.lf-movie-player-container');
        if (playerSection) {
            playerSection.scrollIntoView({ behavior: 'smooth' });
        }
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
                </div>

                {/* Trouble Playing - shows in clean-view with logo */}
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
                        {logoUrl ? (
                            <img
                                className="lf-hero-title-logo"
                                src={logoUrl}
                                alt={movie.Name}
                            />
                        ) : (
                            <h1 className="lf-movie-hero__title">{movie.Name}</h1>
                        )}

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
                            <button
                                className="lf-btn lf-btn--primary lf-btn--ring-hover"
                                onClick={scrollToPlayer}
                            >
                                <span className="material-icons">play_arrow</span>
                                {movie.UserData?.PlaybackPositionTicks > 0
                                    ? 'Resume'
                                    : 'Start Watching'
                                }
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

                        </div>
                    </div>
                </div>
            </section>

            <hr className="lf-section-divider" />

            {/* Movie Header & Player Section */}
            <div className="lf-content-section" style={{ paddingBottom: 0 }}>
                <div className="lf-movies-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div className="lf-section-title" style={{ fontSize: '1.5rem' }}>{movie.Name}</div>

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

                        {/* Mark Watched Button */}
                        <button
                            className={`lf-filter-btn ${isPlayed ? 'is-active' : ''}`}
                            onClick={togglePlayed}
                            title={isPlayed ? "Mark Unwatched" : "Mark Watched"}
                            style={isPlayed ? { color: 'var(--clr-success)', borderColor: 'var(--clr-success)', background: 'rgba(76, 175, 80, 0.1)' } : {}}
                        >
                            <span className="material-icons">{isPlayed ? 'check_circle' : 'check_circle_outline'}</span>
                            <span>{isPlayed ? 'Watched' : 'Mark Watched'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Embedded Player */}
            <div className="lf-movie-player-container">
                <MoviePlayer itemId={movie.Id} forceAutoPlay={location.state?.autoplay} />
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
                <div className="lf-blocked-modal-overlay" onClick={() => { setShowBlockedModal(false); handleStopTrailer(); }}>
                    <div className="lf-blocked-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="lf-blocked-modal__close"
                            onClick={() => { setShowBlockedModal(false); handleStopTrailer(); }}
                        >
                            <span className="material-icons">close</span>
                        </button>
                        <span className="material-icons lf-blocked-icon">error_outline</span>
                        <h3>Playback issue</h3>
                        <p>The trailer can't play — your browser's tracking protection or ad blocker is likely blocking the YouTube embed.</p>
                        <button
                            className="lf-btn lf-btn--glass"
                            onClick={() => {
                                setShowBlockedModal(false);
                                handleStopTrailer();
                            }}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MovieDetail;
