import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { useParams, useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import Navbar from '../../components/Navbar';
import './Player.css';

const Player = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const containerRef = useRef(null); // Ref for fullscreen toggling

    // Player State
    const [isPlaying, setIsPlaying] = useState(true); // Auto-play
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [buffered, setBuffered] = useState(0);
    const [isWindowed, setIsWindowed] = useState(true); // Default to windowed

    // Data State
    const [item, setItem] = useState(null);
    const [playbackUrl, setPlaybackUrl] = useState(null);
    const [centerIcon, setCenterIcon] = useState(null);

    // Trickplay (BIF) State
    const [trickplayImages, setTrickplayImages] = useState(null);
    const [hoverTime, setHoverTime] = useState(null);
    const [hoverPosition, setHoverPosition] = useState(0); // Standardized 0-1 position
    const [isHoveringTimeline, setIsHoveringTimeline] = useState(false);
    const [thumbnailUrl, setThumbnailUrl] = useState(null);

    // Season/Episode State
    const [seasons, setSeasons] = useState([]);
    const [currentSeasonId, setCurrentSeasonId] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [episodesLoading, setEpisodesLoading] = useState(false);

    const controlsTimeoutRef = useRef(null);
    const hlsRef = useRef(null);
    const progressInterval = useRef(null);

    // --- 1. Fetch Item & Playback Info ---
    useEffect(() => {
        const loadItem = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const user = await jellyfinService.getCurrentUser();
                if (!user) { navigate('/login'); return; }

                const itemData = await jellyfinService.getItem(user.Id, id);
                setItem(itemData);

                // If it's an episode, fetch seasons
                if (itemData.Type === 'Episode' && itemData.SeriesId) {
                    loadSeasons(user.Id, itemData.SeriesId, itemData.SeasonId);
                }

                // Get Stream URL
                const url = jellyfinService.getStreamUrl(itemData.Id);
                setPlaybackUrl(url);

                // Fetch Trickplay Data
                loadTrickplayData(itemData.Id);

            } catch (error) {
                console.error("Failed to load item", error);
                setError("Failed to load content.");
                setIsLoading(false);
            }
        };
        loadItem();
    }, [id, navigate]);

    // --- 2. Fetch Seasons & Episodes ---
    const loadSeasons = async (userId, seriesId, initialSeasonId) => {
        try {
            const seasonsData = await jellyfinService.getSeasons(userId, seriesId);
            setSeasons(seasonsData.Items || []);

            // Set current season (either the episode's season or the first one)
            const seasonToLoad = initialSeasonId || (seasonsData.Items?.[0]?.Id);
            setCurrentSeasonId(seasonToLoad);
        } catch (error) {
            console.error("Failed to load seasons", error);
        }
    };

    // Load episodes when season changes
    useEffect(() => {
        if (currentSeasonId && item?.SeriesId) {
            const fetchEpisodes = async () => {
                setEpisodesLoading(true);
                try {
                    const user = await jellyfinService.getCurrentUser();
                    const eps = await jellyfinService.getEpisodes(user.Id, item.SeriesId, currentSeasonId);
                    setEpisodes(eps.Items || []);
                } catch (err) {
                    console.error("Failed to load episodes", err);
                } finally {
                    setEpisodesLoading(false);
                }
            };
            fetchEpisodes();
        }
    }, [currentSeasonId, item?.SeriesId]);

    // --- 3. Trickplay Logic ---
    const loadTrickplayData = async (itemId) => {
        try {
            const width = 320; // Preferred width
            const bifUrl = await jellyfinService.getTrickplayBifUrl(itemId, width);

            if (bifUrl) {
                // Parse BIF
                const bifData = await jellyfinService.fetchAndParseBif(bifUrl);
                setTrickplayImages(bifData);
            }
        } catch (e) {
            console.warn("Failed to load trickplay data", e);
        }
    };

    const handleTimelineHover = (e) => {
        if (!duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const time = percent * duration;

        setHoverTime(time);
        setHoverPosition(percent); // Store exact percent for positioning
        setIsHoveringTimeline(true);

        // Find matching frame
        if (trickplayImages && trickplayImages.length > 0) {
            // Find the image frame for this timestamp
            const frame = trickplayImages.find(img => time >= img.startTime && time < img.endTime);
            if (frame) {
                setThumbnailUrl(frame.url);
            } else {
                setThumbnailUrl(null);
            }
        }
    };

    const handleTimelineLeave = () => {
        setIsHoveringTimeline(false);
        setHoverTime(null);
        setThumbnailUrl(null);
    };


    // --- 4. HLS & Video Setup ---
    useEffect(() => {
        if (!playbackUrl) return;

        if (Hls.isSupported()) {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }

            const hls = new Hls({
                capLevelToPlayerSize: true,
                autoStartLoad: true
            });

            hls.loadSource(playbackUrl);
            hls.attachMedia(videoRef.current);
            hlsRef.current = hls;

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                if (videoRef.current && isPlaying) {
                    videoRef.current.play().catch(e => console.log("Autoplay prevented", e));
                }
                setIsLoading(false);
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error("HLS Fatal Error", data);
                    // Try to recover
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            hls.destroy();
                            break;
                    }
                }
            });

        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            videoRef.current.src = playbackUrl;
            videoRef.current.addEventListener('loadedmetadata', () => {
                if (isPlaying) videoRef.current.play();
                setIsLoading(false);
            });
        } else {
            // Fallback to src
            videoRef.current.src = playbackUrl;
            videoRef.current.addEventListener('loadedmetadata', () => {
                if (isPlaying) videoRef.current.play();
                setIsLoading(false);
            });
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [playbackUrl]);


    // --- 5. Playback Reporting (Resume) ---
    useEffect(() => {
        if (!item || !videoRef.current) return;

        // Initial seek if resuming
        if (item.UserData && item.UserData.PlaybackPositionTicks) {
            const startSeconds = item.UserData.PlaybackPositionTicks / 10000000;
            const handleLoaded = () => {
                if (startSeconds > 0 && startSeconds < videoRef.current.duration) {
                    videoRef.current.currentTime = startSeconds;
                }
            };
            // HLS sometimes needs a slight delay or check
            videoRef.current.addEventListener('loadedmetadata', handleLoaded);
            // Also try immediately if readyState is enough
            if (videoRef.current.readyState >= 1) handleLoaded();

            return () => videoRef.current?.removeEventListener('loadedmetadata', handleLoaded);
        }
    }, [item]);

    // Periodic Reporting
    useEffect(() => {
        if (!item) return;

        progressInterval.current = setInterval(() => {
            if (videoRef.current && !videoRef.current.paused) {
                const time = videoRef.current.currentTime;
                // Report to Jellyfin
                jellyfinService.reportPlaybackProgress(
                    item.Id,
                    time * 10000000,
                    false // IsPaused
                ).catch(err => console.warn("Report progress failed", err));
            }
        }, 10000); // Every 10s

        return () => clearInterval(progressInterval.current);
    }, [item]);

    const reportStop = useCallback(() => {
        if (item && videoRef.current) {
            jellyfinService.reportPlaybackStopped(
                item.Id,
                Math.floor(videoRef.current.currentTime * 10000000)
            );
        }
    }, [item]);

    // Report stop on unmount
    useEffect(() => {
        return () => {
            reportStop();
        };
    }, [reportStop]);


    // --- 6. Event Handlers ---

    const togglePlay = () => {
        if (videoRef.current) {
            if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
                flashCenterIcon('play_arrow');
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
                flashCenterIcon('pause');
            }
        }
    };

    const flashCenterIcon = (icon) => {
        setCenterIcon(icon);
        setTimeout(() => setCenterIcon(null), 600);
    };

    const handleVolumeChange = (e) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (videoRef.current) {
            videoRef.current.volume = val;
            setIsMuted(val === 0);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            const newMuted = !isMuted;
            setIsMuted(newMuted);
            videoRef.current.muted = newMuted;
            if (newMuted) setVolume(0);
            else {
                setVolume(1);
                videoRef.current.volume = 1;
            }
        }
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleBack = () => {
        reportStop();
        navigate(-1);
    };

    const toggleWindowedMode = () => {
        if (!isWindowed) {
            // We are currently in Fullscreen (via our state), so we want to go to Windowed.
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.warn(err));
            }
            setIsWindowed(true);
        } else {
            // Go to "Cinema Mode" (our fullscreen state)
            setIsWindowed(false);
        }
    };

    const toggleFullscreen = () => {
        // Toggle browser fullscreen on the specific container
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
            setIsWindowed(false);
        } else {
            document.exitFullscreen();
            setIsWindowed(true);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            setDuration(videoRef.current.duration || 0);
            if (videoRef.current.buffered.length > 0) {
                setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
            }
        }
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    const handleSeasonChange = (seasonId) => {
        setCurrentSeasonId(seasonId);
    };

    const handleEpisodeClick = (epId) => {
        if (epId === item.Id) return;
        reportStop();
        navigate(`/play/${epId}`);
    };


    // --- 7. Format Helpers ---
    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Calculate progress percentage
    const progressPercent = duration ? (currentTime / duration) * 100 : 0;
    const bufferedPct = duration ? (buffered / duration) * 100 : 0;

    return (
        <div className={`lf-player-page ${!isWindowed ? 'is-fullscreen-mode' : ''}`}>
            {/* Navbar is only visible in Windowed Mode */}
            {isWindowed && <Navbar alwaysFilled={true} />}

            <div
                ref={containerRef}
                className={`lf-player-container ${!isWindowed ? 'active-fullscreen' : ''}`}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => isPlaying && setShowControls(false)}
            >
                {/* --- Main Player Area --- */}
                <div className="lf-player-video-wrapper">
                    <video
                        ref={videoRef}
                        className="lf-player-video"
                        onClick={togglePlay}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={() => { setIsPlaying(false); reportStop(); setShowControls(true); }}
                        onWaiting={() => setIsLoading(true)}
                        onCanPlay={() => setIsLoading(false)}
                    />

                    {/* Loader */}
                    {isLoading && (
                        <div className="lf-player-loader">
                            <div className="spinner"></div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="lf-player-error">
                            <div className="error-icon">!</div>
                            <p>{error}</p>
                            <button onClick={handleBack}>Go Back</button>
                        </div>
                    )}

                    {/* Center Flash Icon */}
                    <div className={`lf-player-center-icon ${centerIcon ? 'visible' : ''}`}>
                        <span className="material-icons">{centerIcon}</span>
                    </div>

                    {/* Controls Overlay */}
                    <div className={`lf-player-controls ${showControls ? 'visible' : ''}`}>

                        {/* Top Bar (Back Button & Title) */}
                        <div className="lf-player-controls-top">
                            <button className="icon-btn back-btn" onClick={handleBack}>
                                <span className="material-icons">arrow_back</span>
                            </button>
                            <div className="player-title">
                                {item ? (
                                    <>
                                        <span className="series-title">{item.SeriesName}</span>
                                        {item.SeriesName && item.Name && <span className="divider">•</span>}
                                        <span className="episode-title">{item.Name}</span>
                                    </>
                                ) : 'Loading...'}
                            </div>
                        </div>

                        {/* Center Play Button (Big) - displayed when paused */}
                        {!isPlaying && !isLoading && !error && (
                            <button className="center-play-btn" onClick={togglePlay}>
                                <span className="material-icons">play_arrow</span>
                            </button>
                        )}

                        {/* Bottom Bar */}
                        <div className="lf-player-controls-bottom">

                            {/* Detailed Timeline with Thumbnails */}
                            <div
                                className="lf-player-timeline-container"
                                onMouseMove={handleTimelineHover}
                                onMouseLeave={handleTimelineLeave}
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const percent = x / rect.width;
                                    const newTime = percent * duration;
                                    if (videoRef.current) {
                                        videoRef.current.currentTime = newTime;
                                        setCurrentTime(newTime);
                                    }
                                }}
                            >
                                {/* Thumbnail Popup */}
                                {isHoveringTimeline && (
                                    <div
                                        className="lf-timeline-tooltip"
                                        style={{ left: `${hoverPosition * 100}%` }}
                                    >
                                        {thumbnailUrl ? (
                                            <div
                                                className="lf-timeline-thumbnail"
                                                style={{ backgroundImage: `url('${thumbnailUrl}')` }}
                                            ></div>
                                        ) : null}
                                        <span className="lf-timeline-time">{formatTime(hoverTime)}</span>
                                    </div>
                                )}

                                <div className="lf-player-timeline-track">
                                    <div className="lf-player-timeline-bg"></div>
                                    <div
                                        className="lf-player-timeline-buffered"
                                        style={{ width: `${bufferedPct}%` }}
                                    ></div>
                                    <div
                                        className="lf-player-timeline-fill"
                                        style={{ width: `${progressPercent}%` }}
                                    >
                                        <div className="lf-player-timeline-thumb"></div>
                                    </div>
                                    {/* Hover Ghost Fill */}
                                    {isHoveringTimeline && (
                                        <div
                                            className="lf-player-timeline-hover-fill"
                                            style={{ width: `${hoverPosition * 100}%` }}
                                        ></div>
                                    )}
                                </div>
                            </div>

                            <div className="lf-player-controls-row">
                                <div className="controls-left">
                                    <button className="icon-btn" onClick={togglePlay}>
                                        <span className="material-icons">{isPlaying ? 'pause' : 'play_arrow'}</span>
                                    </button>

                                    <div className="volume-container">
                                        <button className="icon-btn" onClick={toggleMute}>
                                            <span className="material-icons">
                                                {isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                                            </span>
                                        </button>
                                        <div className="volume-slider-wrapper">
                                            <input
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={isMuted ? 0 : volume}
                                                onChange={handleVolumeChange}
                                                className="volume-slider"
                                            />
                                        </div>
                                    </div>

                                    <div className="time-display">
                                        {formatTime(currentTime)} / {formatTime(duration)}
                                    </div>
                                </div>

                                <div className="controls-right">
                                    <button className="icon-btn" onClick={toggleWindowedMode} title={isWindowed ? "Cinema Mode" : "Windowed Mode"}>
                                        <span className="material-icons">
                                            {isWindowed ? 'crop_16_9' : 'picture_in_picture_alt'}
                                        </span>
                                    </button>
                                    <button className="icon-btn" onClick={toggleFullscreen} title="Fullscreen">
                                        <span className="material-icons">
                                            {document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar for Windowed Mode (Visible ONLY if Windowed) */}
                {isWindowed && item && item.Type === 'Episode' && (
                    <div className="lf-player-sidebar">
                        <div className="lf-player-sidebar-content">
                            {/* Metadata Section */}
                            <div className="lf-player-meta">
                                <h2 className="lf-player-meta-title">{item.SeriesName}</h2>
                                <h3 className="lf-player-meta-subtitle">{item.Name}</h3>
                                <div className="lf-player-meta-info">
                                    <span>S{item.ParentIndexNumber} E{item.IndexNumber}</span>
                                    {item.ProductionYear && <><span className="meta-divider">•</span><span>{item.ProductionYear}</span></>}
                                </div>
                                <p className="lf-player-meta-desc">{item.Overview}</p>
                            </div>

                            {/* Episode List Section */}
                            <div className="lf-player-episodes">
                                <div className="lf-episodes-header">
                                    <h4 className="section-title">Episodes</h4>
                                    <div className="season-select-container">
                                        <select
                                            className="lf-season-select"
                                            value={currentSeasonId || ''}
                                            onChange={(e) => handleSeasonChange(e.target.value)}
                                        >
                                            {seasons.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                        </select>
                                        <span className="material-icons select-arrow">expand_more</span>
                                    </div>
                                </div>

                                <div className="lf-episodes-list">
                                    {episodesLoading ? (
                                        <div className="loading-txt">Loading...</div>
                                    ) : (
                                        episodes.map(ep => (
                                            <div
                                                key={ep.Id}
                                                className={`lf-episode-item ${ep.Id === item.Id ? 'current' : ''}`}
                                                onClick={() => handleEpisodeClick(ep.Id)}
                                            >
                                                <div className="ep-img-container">
                                                    <img
                                                        src={jellyfinService.getImageUrl(ep, 'Primary', { maxWidth: 300 })}
                                                        alt={ep.Name}
                                                        onError={(e) => e.target.style.display = 'none'}
                                                    />
                                                    {ep.UserData?.Played && <div className="ep-watched-overlay"><span className="material-icons">check</span></div>}
                                                    {ep.Id === item.Id && <div className="ep-playing-overlay"><span className="material-icons">play_circle</span></div>}
                                                </div>
                                                <div className="ep-info">
                                                    <div className="ep-number">E{ep.IndexNumber}</div>
                                                    <div className="ep-title">{ep.Name}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Player;
