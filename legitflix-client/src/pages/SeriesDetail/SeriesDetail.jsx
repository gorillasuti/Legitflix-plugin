import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import SubtitleModal from '../../components/SubtitleModal';
import { Button } from '@/components/ui/button';
import './SeriesDetail.css';
import jellyfinService from '../../services/jellyfin';
import Footer from '../../components/Footer';
import DetailSkeleton from '../../components/DetailSkeleton';

const SeriesDetail = () => {
    const { id } = useParams();
    const [series, setSeries] = useState(null);
    const [seasons, setSeasons] = useState([]);
    const [episodes, setEpisodes] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState(null);
    const [similars, setSimilars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubtitleModalOpen, setIsSubtitleModalOpen] = useState(false);

    // UI States
    const [isDescExpanded, setIsDescExpanded] = useState(false);
    const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);

    // Legacy / Bulk Edit States
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedEpisodes, setSelectedEpisodes] = useState([]); // Array of IDs
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

    const dropdownRef = useRef(null);
    const langDropdownRef = useRef(null);
    const trailerHelpTimeout = useRef(null);
    const cleanViewTimeout = useRef(null);
    const longPressTimer = useRef(null);
    const trailerIframeRef = useRef(null);

    // Initial Data Load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const user = await jellyfinService.getCurrentUser();
                if (!user) return;

                // 1. Fetch Series Details
                const seriesData = await jellyfinService.getSeries(user.Id, id);
                setSeries(seriesData);
                setIsFavorite(seriesData.UserData?.IsFavorite || false);

                // Extract trailer key (if exists)
                if (seriesData.RemoteTrailers && seriesData.RemoteTrailers.length > 0) {
                    const url = seriesData.RemoteTrailers[0].Url;
                    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                    if (ytMatch && ytMatch[1]) {
                        setTrailerKey(ytMatch[1]);
                    }
                }

                // 2. Fetch Seasons
                const seasonsData = await jellyfinService.getSeasons(user.Id, id);
                let defaultSeasonId = null;

                if (seasonsData.Items && seasonsData.Items.length > 0) {
                    setSeasons(seasonsData.Items);
                    defaultSeasonId = seasonsData.Items[0].Id;
                }

                // 3. Smart Season Logic (Check Next Up)
                try {
                    const nextUpData = await jellyfinService.getNextUp(user.Id, id);
                    if (nextUpData && nextUpData.Items && nextUpData.Items.length > 0) {
                        const nextUpEp = nextUpData.Items[0];
                        // If we have Next Up, try to find its season in our list
                        // Note: NextUp item usually has SeasonId
                        if (nextUpEp.SeasonId) {
                            const seasonExists = seasonsData.Items.find(s => s.Id === nextUpEp.SeasonId);
                            if (seasonExists) {
                                defaultSeasonId = nextUpEp.SeasonId;
                            }
                        }
                    }
                } catch (e) {
                    console.warn("Failed to fetch Next Up for smart season selection", e);
                }

                if (defaultSeasonId) {
                    setSelectedSeasonId(defaultSeasonId);
                }

                // 4. Fetch Similar Items
                const similarData = await jellyfinService.getSimilarItems(user.Id, id);
                setSimilars(similarData.Items || []);

            } catch (error) {
                console.error("Failed to load series data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    // Fetch episodes when selected season changes
    const loadEpisodes = async () => {
        if (!series || !selectedSeasonId) return;
        try {
            const user = await jellyfinService.getCurrentUser();
            const episodesData = await jellyfinService.getEpisodes(user.Id, series.Id, selectedSeasonId);
            setEpisodes(episodesData.Items || []);
        } catch (error) {
            console.error("Failed to load episodes", error);
        }
    };

    useEffect(() => {
        loadEpisodes();
    }, [selectedSeasonId, series]);

    // Click outside handler for dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsSeasonDropdownOpen(false);
            }
            if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
                setIsLangDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Selection Logic
    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedEpisodes([]); // Clear on toggle
    };

    const handleEpisodeClick = (episodeId) => {
        if (isSelectionMode) {
            if (selectedEpisodes.includes(episodeId)) {
                setSelectedEpisodes(selectedEpisodes.filter(id => id !== episodeId));
            } else {
                setSelectedEpisodes([...selectedEpisodes, episodeId]);
            }
        } else {
            console.log('Play Episode', episodeId);
            // TODO: Navigate to player
        }
    };

    const markSelectedPlayed = async (isPlayed) => {
        if (selectedEpisodes.length === 0) return;
        const user = await jellyfinService.getCurrentUser();
        if (!user) return;

        // Optimistic update could be done here, but let's just await
        await Promise.all(selectedEpisodes.map(epId => jellyfinService.markPlayed(user.Id, epId, isPlayed)));

        // Refresh episodes to show new status
        await loadEpisodes();

        // Clear selection
        setSelectedEpisodes([]);
    };

    const handleSelectAll = () => {
        // If all currently visible episodes are selected, deselect all. Otherwise, select all.
        const allEpisodeIds = episodes.map(ep => ep.Id);
        const allSelected = allEpisodeIds.every(id => selectedEpisodes.includes(id));

        if (allSelected) {
            setSelectedEpisodes([]);
        } else {
            setSelectedEpisodes(allEpisodeIds);
        }
    };

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
            await jellyfinService.markFavorite(user.Id, series.Id, newFav);
            setIsFavorite(newFav);
        } catch (err) {
            console.error("Favorite toggle failed", err);
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

    // Trailer Logic
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

    // Longpress logic
    const handlePointerDown = (episodeId) => {
        if (isSelectionMode) return; // Mode already on

        longPressTimer.current = setTimeout(() => {
            setIsSelectionMode(true);
            setSelectedEpisodes([episodeId]);
            // Subtle vibrate if mobile?
            if (navigator.vibrate) navigator.vibrate(50);
        }, 600); // 600ms longpress
    };

    const handlePointerUp = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    // Smart Button Logic
    const getSmartButtonInfo = () => {
        if (selectedEpisodes.length === 0) return { label: 'Mark Watched', icon: 'visibility' };

        // Check if any selected is unwatched. If so, default to Mark Watched.
        // If all are watched, show Mark Unwatched.
        const allWatched = selectedEpisodes.every(id => {
            const ep = episodes.find(e => e.Id === id);
            return ep?.UserData?.Played;
        });

        if (allWatched) {
            return { label: 'Mark Unwatched', icon: 'visibility_off', isPlayed: false };
        }
        return { label: 'Mark Watched', icon: 'visibility', isPlayed: true };
    };

    const smartBtn = getSmartButtonInfo();

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (cleanViewTimeout.current) clearTimeout(cleanViewTimeout.current);
            if (trailerHelpTimeout.current) clearTimeout(trailerHelpTimeout.current);
            if (window.lfMessageHandler) window.removeEventListener('message', window.lfMessageHandler);
        };
    }, []);

    if (loading) return <DetailSkeleton />;
    if (!series) return <div className="lf-series-container" style={{ color: 'white' }}>Series not found</div>;

    const backdropUrl = jellyfinService.getImageUrl(series, 'Backdrop');
    const posterUrl = jellyfinService.getImageUrl(series, 'Primary');
    const logoUrl = jellyfinService.getImageUrl(series, 'Logo');

    // Cast processing: Take top 10
    const cast = series.People ? series.People.slice(0, 10) : [];
    const selectedSeason = seasons.find(s => s.Id === selectedSeasonId);

    // Dummy languages for selector (In real app, we'd scan available streams from first ep)
    const audioOptions = [{ code: 'en', name: 'English' }, { code: 'ja', name: 'Japanese' }];
    const subOptions = [{ code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }, { code: 'hu', name: 'Hungarian' }];

    return (
        <div className="lf-series-container">
            <Navbar alwaysFilled={true} />

            {/* Hero Section */}
            <section
                className={`lf-series-hero ${isCleanView ? 'is-clean-view' : ''}`}
                onMouseMove={resetCleanViewTimer}
                onClick={resetCleanViewTimer}
            >
                <div className={`lf-series-hero__backdrop ${isTrailerPlaying ? 'is-hidden' : ''}`} style={{ backgroundImage: `url('${backdropUrl}')` }}></div>

                {/* Trailer Container */}
                <div className={`lf-series-hero__trailer ${isTrailerPlaying ? 'is-playing' : ''}`}>
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
                        className="lf-series-hero__logo"
                        src={logoUrl}
                        alt={series.Name}
                    />
                )}

                <div className="lf-series-hero__content">
                    <img className="lf-series-hero__poster" src={posterUrl} alt={series.Name} />

                    <div className="lf-series-hero__info">
                        <h1 className="lf-series-hero__title">{series.Name}</h1>

                        <div className="lf-series-hero__meta">
                            <span>{series.ProductionYear}</span>
                            <span>•</span>
                            <span>{series.OfficialRating}</span>
                            <span>•</span>
                            <div className="lf-series-hero__rating">
                                <span className="material-icons">star</span>
                                <span>{series.CommunityRating ? series.CommunityRating.toFixed(1) : ''}</span>
                            </div>
                        </div>

                        <div className="lf-series-hero__details">
                            <div className="lf-series-hero__description">
                                <p className={`lf-series-hero__description-text ${isDescExpanded ? 'is-expanded' : ''}`}>
                                    {series.Overview}
                                </p>
                                {series.Overview && series.Overview.length > 200 && (
                                    <button
                                        className={`lf-series-hero__load-more ${isDescExpanded ? 'is-expanded' : ''}`}
                                        onClick={() => setIsDescExpanded(!isDescExpanded)}
                                    >
                                        {isDescExpanded ? 'Show Less' : 'Read More'}
                                        <span className="material-icons">expand_more</span>
                                    </button>
                                )}
                            </div>

                            {cast.length > 0 && (
                                <div className="lf-series-hero__cast-info">
                                    <div style={{ marginBottom: 8 }}>
                                        <strong>Starring: </strong>
                                        {cast.slice(0, 3).map(p => p.Name).join(', ')}
                                        {cast.length > 3 && <span>...</span>}
                                    </div>
                                    <div>
                                        <strong>Genres: </strong>
                                        {series.Genres ? series.Genres.join(', ') : ''}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="lf-series-hero__actions">
                            <button className="lf-btn lf-btn--primary lf-btn--ring-hover">
                                <span className="material-icons">play_arrow</span>
                                Start Watching S1 E1
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

            {/* Episodes Section */}
            <div className="lf-content-section">
                <div className="lf-episodes-header">
                    {/* Season Selector */}
                    {/* Season Selector - Native */}
                    <div className="lf-season-selector-wrapper">
                        <select
                            className="lf-season-select"
                            value={selectedSeasonId || ''}
                            onChange={(e) => setSelectedSeasonId(e.target.value)}
                        >
                            {seasons.map(season => (
                                <option key={season.Id} value={season.Id}>
                                    {season.Name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filter / Bulk Controls */}
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

                        {/* Bulk Edit Logic */}
                        {isSelectionMode ? (
                            <>
                                <button
                                    className="lf-edit-subs-btn"
                                    style={{ width: 'auto', padding: '8px 16px' }}
                                    onClick={() => markSelectedPlayed(smartBtn.isPlayed)}
                                >
                                    <span className="material-icons">{smartBtn.icon}</span>
                                    <span>{smartBtn.label}</span>
                                </button>
                                <button
                                    className="lf-filter-btn"
                                    onClick={handleSelectAll}
                                >
                                    <span className="material-icons">select_all</span>
                                    <span>{episodes.length > 0 && episodes.every(e => selectedEpisodes.includes(e.Id)) ? 'Deselect All' : 'Select All'}</span>
                                </button>
                                <button className="lf-filter-btn is-active" onClick={toggleSelectionMode} title="Cancel">
                                    <span className="material-icons">close</span>
                                    <span>Cancel</span>
                                </button>
                            </>
                        ) : (
                            <button className="lf-filter-btn" onClick={toggleSelectionMode} title="Bulk Edit">
                                <span className="material-icons">done_all</span>
                                <span>Select Item</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="lf-episode-grid">
                    {episodes.map(ep => {
                        const isSelected = selectedEpisodes.includes(ep.Id);
                        const isPlayed = ep.UserData?.Played;

                        return (
                            <div
                                key={ep.Id}
                                className={`lf-episode-card ${isSelectionMode ? 'is-selecting-mode' : ''} ${isSelected ? 'is-selected' : ''} ${isPlayed ? 'is-watched' : ''}`}
                                onClick={() => handleEpisodeClick(ep.Id)}
                                onPointerDown={() => handlePointerDown(ep.Id)}
                                onPointerUp={handlePointerUp}
                                onPointerLeave={handlePointerUp}
                            >
                                <div className="lf-episode-card__thumbnail">
                                    <img src={jellyfinService.getImageUrl(ep, 'Primary')} alt={ep.Name} loading="lazy" />
                                    {ep.IndexNumber && (
                                        <span className="lf-episode-card__badge">{ep.IndexNumber}</span>
                                    )}
                                    <div className="lf-episode-card__play-icon">
                                        <span className="material-icons">play_arrow</span>
                                    </div>
                                    {/* Checkbox Overlay */}
                                    <div className="lf-episode-checkbox">
                                        <span className="material-icons">check</span>
                                    </div>
                                    {isPlayed && !isSelectionMode && (
                                        <div className="lf-episode-checkbox" style={{ opacity: 1, background: '#4caf50', borderColor: '#4caf50' }}>
                                            <span className="material-icons" style={{ opacity: 1, transform: 'scale(1)' }}>check</span>
                                        </div>
                                    )}
                                </div>
                                <div className="lf-episode-card__info">
                                    <h3 className="lf-episode-card__title">{ep.Name}</h3>
                                    <p className="lf-episode-card__subtitle">{ep.Overview}</p>
                                </div>
                            </div>
                        );
                    })}
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
                            <Link to={`/series/${item.Id}`} key={item.Id} className="lf-similar-card">
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
                seriesId={series ? series.Id : ''}
                initialSeasonId={selectedSeasonId}
                initialEpisodeId={episodes.length > 0 ? episodes[0].Id : ''}
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

export default SeriesDetail;
