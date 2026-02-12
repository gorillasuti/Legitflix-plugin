import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import jellyfinService from '../../services/jellyfin';
import './Player.css';

const Player = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const controlsTimerRef = useRef(null);
    const containerRef = useRef(null);

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [centerIcon, setCenterIcon] = useState(null);

    // Trickplay State
    const [trickplayData, setTrickplayData] = useState(null);
    const [hoverTime, setHoverTime] = useState(null);
    const [hoverX, setHoverX] = useState(0);

    // Windowed Mode & Metadata State
    const [isWindowed, setIsWindowed] = useState(true);
    const [seasons, setSeasons] = useState([]);
    const [currentSeasonId, setCurrentSeasonId] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [loadingEpisodes, setLoadingEpisodes] = useState(false);

    // Format seconds to hh:mm:ss or mm:ss
    const formatTime = (seconds) => {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    // Show controls temporarily
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = setTimeout(() => {
            if (playing) setShowControls(false);
        }, 3000);
    }, [playing]);

    // Load item details and start playback
    useEffect(() => {
        const loadAndPlay = async () => {
            try {
                setLoading(true);
                setError(null);

                const user = await jellyfinService.getCurrentUser();
                if (!user) {
                    setError('Not logged in.');
                    setLoading(false);
                    return;
                }

                const itemData = await jellyfinService.getItemDetails(user.Id, id);
                if (!itemData) {
                    setError('Item not found.');
                    setLoading(false);
                    return;
                }
                setItem(itemData);

                // Extract trickplay info if available
                if (itemData.Trickplay && itemData.Trickplay.Width && itemData.Trickplay.Interval) {
                    setTrickplayData({
                        width: itemData.Trickplay.Width,
                        height: itemData.Trickplay.Height,
                        interval: itemData.Trickplay.Interval, // in ms
                        thumbnailWidth: 320 // Default or calculated width for display
                    });
                    console.log('[LegitFlix Player] Trickplay data found:', itemData.Trickplay);
                } else {
                    // Fallback: check if we can infer or if it's missing
                    console.log('[LegitFlix Player] No detailed Trickplay data found.');
                    // We could try to assume default 10s interval if Width/Height aren't explicitly there but that might be risky without knowing if images exist.
                    // The server usually sends Trickplay object if generation is enabled.
                }

                // Build the stream URL
                const basePath = jellyfinService.api?.configuration?.basePath || jellyfinService.api?.basePath || '';
                const token = jellyfinService.api?.accessToken || '';

                // Try direct stream first (mp4/mkv via Jellyfin's API)
                const mediaSource = itemData.MediaSources?.[0];
                if (!mediaSource) {
                    setError('No media source available for this item.');
                    setLoading(false);
                    return;
                }

                const mediaSourceId = mediaSource.Id;
                const container = mediaSource.Container || 'mp4';

                // Construct the stream URL - Jellyfin supports HLS and direct stream
                // Try HLS first for broad format support (Jellyfin will transcode if needed)
                const hlsUrl = `${basePath}/Videos/${id}/master.m3u8?MediaSourceId=${mediaSourceId}&api_key=${token}&VideoCodec=h264&AudioCodec=aac&TranscodingMaxAudioChannels=2`;

                // Direct stream URL (works for natively supported formats like mp4)
                const directUrl = `${basePath}/Videos/${id}/stream.${container}?Static=true&MediaSourceId=${mediaSourceId}&api_key=${token}`;

                const video = videoRef.current;
                if (!video) return;

                // Attempt HLS first
                if (Hls.isSupported()) {
                    const hls = new Hls({
                        startLevel: -1, // Auto quality
                        maxBufferLength: 30,
                        maxMaxBufferLength: 60,
                    });
                    hlsRef.current = hls;

                    hls.on(Hls.Events.ERROR, (event, data) => {
                        console.warn('[LegitFlix Player] HLS error:', data.type, data.details);
                        if (data.fatal) {
                            // Fallback to direct stream
                            console.log('[LegitFlix Player] HLS fatal error, falling back to direct stream');
                            hls.destroy();
                            hlsRef.current = null;
                            video.src = directUrl;
                            video.load();
                        }
                    });

                    hls.loadSource(hlsUrl);
                    hls.attachMedia(video);

                    hls.on(Hls.Events.MANIFEST_PARSED, () => {
                        setLoading(false);
                        video.play().catch(() => setPlaying(false));
                    });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    // Native HLS (Safari)
                    video.src = hlsUrl;
                    video.addEventListener('loadedmetadata', () => {
                        setLoading(false);
                        video.play().catch(() => setPlaying(false));
                    }, { once: true });
                } else {
                    // Fallback: direct stream
                    video.src = directUrl;
                    video.addEventListener('loadedmetadata', () => {
                        setLoading(false);
                        video.play().catch(() => setPlaying(false));
                    }, { once: true });
                }

                // Resume from where user left off
                if (itemData.UserData?.PlaybackPositionTicks) {
                    const resumeSeconds = itemData.UserData.PlaybackPositionTicks / 10000000;
                    video.addEventListener('canplay', () => {
                        if (video.currentTime < 1) {
                            video.currentTime = resumeSeconds;
                        }
                    }, { once: true });
                }

                // Fetch Seasons and Episodes if it's an episode
                if (itemData.Type === 'Episode' && itemData.SeriesId) {
                    try {
                        const seasonsData = await jellyfinService.getSeasons(user.Id, itemData.SeriesId);
                        if (seasonsData && seasonsData.Items) {
                            setSeasons(seasonsData.Items);
                            // Set current season
                            const seasonId = itemData.SeasonId || seasonsData.Items[0]?.Id;
                            setCurrentSeasonId(seasonId);

                            // Fetch episodes for this season
                            if (seasonId) {
                                setLoadingEpisodes(true);
                                const episodesData = await jellyfinService.getEpisodes(user.Id, itemData.SeriesId, seasonId);
                                if (episodesData && episodesData.Items) {
                                    setEpisodes(episodesData.Items);
                                }
                                setLoadingEpisodes(false);
                            }
                        }
                    } catch (seasonErr) {
                        console.warn('[LegitFlix Player] Failed to load seasons/episodes:', seasonErr);
                    }
                }
            } catch (err) {
                console.error('[LegitFlix Player] Failed to load:', err);
                setError('Failed to load video. Please try again.');
                setLoading(false);
            }
        };

        loadAndPlay();

        return () => {
            // Cleanup
            if (hlsRef.current) {
                hlsRef.current.destroy();
                hlsRef.current = null;
            }
            if (controlsTimerRef.current) {
                clearTimeout(controlsTimerRef.current);
            }
            // Report playback stop
            reportPlaybackStopped();
        };
    }, [id]);

    // Report playback progress to Jellyfin
    const reportPlaybackStopped = async () => {
        try {
            const user = await jellyfinService.getCurrentUser();
            if (!user || !videoRef.current) return;
            const positionTicks = Math.floor(videoRef.current.currentTime * 10000000);
            const basePath = jellyfinService.api?.configuration?.basePath || jellyfinService.api?.basePath || '';
            const token = jellyfinService.api?.accessToken || '';
            await fetch(`${basePath}/Sessions/Playing/Stopped`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Emby-Authorization': `MediaBrowser Client="LegitFlix", Device="Web", DeviceId="legitflix-web", Version="1.0.0", Token="${token}"`
                },
                body: JSON.stringify({
                    ItemId: id,
                    PositionTicks: positionTicks,
                })
            });
        } catch (e) {
            console.warn('[LegitFlix Player] Failed to report playback stop', e);
        }
    };

    // Video event handlers
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        const onTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            // Update buffered
            if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
            }
        };
        const onDurationChange = () => setDuration(video.duration || 0);
        const onVolumeChange = () => {
            setVolume(video.volume);
            setMuted(video.muted);
        };
        const onEnded = () => {
            setPlaying(false);
            setShowControls(true);
        };
        const onError = (e) => {
            console.error('[LegitFlix Player] Video error:', e);
            if (!loading) setError('Playback error occurred.');
        };
        const onWaiting = () => setLoading(true);
        const onCanPlay = () => setLoading(false);

        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('durationchange', onDurationChange);
        video.addEventListener('volumechange', onVolumeChange);
        video.addEventListener('ended', onEnded);
        video.addEventListener('error', onError);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('canplay', onCanPlay);

        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('durationchange', onDurationChange);
            video.removeEventListener('volumechange', onVolumeChange);
            video.removeEventListener('ended', onEnded);
            video.removeEventListener('error', onError);
            video.removeEventListener('waiting', onWaiting);
            video.removeEventListener('canplay', onCanPlay);
        };
    }, [loading]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            const video = videoRef.current;
            if (!video) return;

            showControlsTemporarily();

            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    video.paused ? video.play() : video.pause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    video.currentTime = Math.max(0, video.currentTime - 10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    video.volume = Math.min(1, video.volume + 0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    video.volume = Math.max(0, video.volume - 0.1);
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'm':
                    e.preventDefault();
                    video.muted = !video.muted;
                    break;
                case 'Escape':
                    e.preventDefault();
                    handleBack();
                    break;
                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showControlsTemporarily]);

    // Fetch episodes when season changes
    useEffect(() => {
        const fetchEpisodes = async () => {
            if (!item || !currentSeasonId || !item.SeriesId) return;

            try {
                setLoadingEpisodes(true);
                const user = await jellyfinService.getCurrentUser();
                const episodesData = await jellyfinService.getEpisodes(user.Id, item.SeriesId, currentSeasonId);
                if (episodesData && episodesData.Items) {
                    setEpisodes(episodesData.Items);
                }
                setLoadingEpisodes(false);
            } catch (err) {
                console.warn('Failed to fetch episodes for season:', err);
                setLoadingEpisodes(false);
            }
        };

        // Only fetch if we have a season ID and it's different from the initial load (which is handled in loadAndPlay)
        // Actually, loadAndPlay handles the initial fetch. 
        // We need this effect to run ONLY when user manually changes season, 
        // BUT we need to avoid double fetching on mount.
        // For now, let's just use a separate handler for dropdown change.
    }, []);

    const handleSeasonChange = async (seasonId) => {
        setCurrentSeasonId(seasonId);
        if (!item || !item.SeriesId) return;

        try {
            setLoadingEpisodes(true);
            const user = await jellyfinService.getCurrentUser();
            const episodesData = await jellyfinService.getEpisodes(user.Id, item.SeriesId, seasonId);
            if (episodesData && episodesData.Items) {
                setEpisodes(episodesData.Items);
            }
            setLoadingEpisodes(false);
        } catch (err) {
            console.warn('Failed to fetch episodes:', err);
            setLoadingEpisodes(false);
        }
    };

    // Toggle Windowed/Fullscreen Mode
    const toggleWindowedMode = () => {
        if (!isWindowed) {
            // We are currently in Fullscreen (via our state), so we want to go to Windowed.
            // But we might ALSO be in browser fullscreen.
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.warn(err));
            }
            setIsWindowed(true);
        } else {
            // Go to "Cinema Mode" (our fullscreen state)
            setIsWindowed(false);
        }
    };

    const handleEpisodeClick = (episodeId) => {
        // Navigate to the new episode
        // This will trigger the useEffect([id]) to reload the player
        navigate(`/play/${episodeId}`);
    };


    // Toggle play/pause
    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
            flashCenterIcon('play_arrow');
        } else {
            video.pause();
            flashCenterIcon('pause');
        }
    };

    // Flash center icon
    const flashCenterIcon = (icon) => {
        setCenterIcon(icon);
        setTimeout(() => setCenterIcon(null), 600);
    };

    // Seek
    const handleProgressClick = (e) => {
        const video = videoRef.current;
        if (!video || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        video.currentTime = pct * duration;
    };

    const handleProgressMouseMove = (e) => {
        if (!duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, x / rect.width));
        setHoverTime(pct * duration);
        setHoverX(x);
    };

    const handleProgressMouseLeave = () => {
        setHoverTime(null);
    };


    // Volume
    const handleVolumeChange = (e) => {
        const video = videoRef.current;
        if (!video) return;
        const val = parseFloat(e.target.value);
        video.volume = val;
        video.muted = val === 0;
    };

    // Fullscreen
    const toggleFullscreen = () => {
        const el = containerRef.current;
        if (!el) return;
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            el.requestFullscreen();
        }
    };

    // Back
    const handleBack = () => {
        navigate(-1);
    };

    // Mouse move handler
    const handleMouseMove = () => {
        showControlsTemporarily();
    };

    // Build title info
    const getTitle = () => {
        if (!item) return { title: '', subtitle: '' };
        if (item.Type === 'Episode') {
            return {
                title: item.SeriesName || '',
                subtitle: `S${item.ParentIndexNumber} E${item.IndexNumber} · ${item.Name}`
            };
        }
        return { title: item.Name || '', subtitle: item.ProductionYear ? String(item.ProductionYear) : '' };
    };

    const { title, subtitle } = getTitle();
    const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
    const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

    return (
        <div
            ref={containerRef}
            className={`lf-player ${showControls ? 'show-controls' : ''} ${isWindowed ? 'lf-player--windowed' : ''}`}
            onMouseMove={handleMouseMove}
            onClick={(e) => {
                // Only toggle play if clicking the video area or the content wrapper
                if (e.target === videoRef.current || e.target.classList.contains('lf-player__content')) {
                    togglePlay();
                }
            }}
        >
            <div className="lf-player__content">
                <video ref={videoRef} className="lf-player__video" />

                {/* Center Play/Pause Flash */}
                <div className={`lf-player__center-play ${centerIcon ? 'visible' : ''}`}>
                    <span className="material-icons">{centerIcon}</span>
                </div>

                {/* Loading */}
                {
                    loading && !error && (
                        <div className="lf-player__loading">
                            <div className="lf-player__spinner" />
                            <span className="lf-player__loading-text">Loading...</span>
                        </div>
                    )
                }

                {/* Error */}
                {
                    error && (
                        <div className="lf-player__error">
                            <span className="material-icons">error_outline</span>
                            <p className="lf-player__error-message">{error}</p>
                            <button className="lf-player__error-btn" onClick={handleBack}>
                                Go Back
                            </button>
                        </div>
                    )
                }

                {/* Top Bar */}
                <div className="lf-player__top-bar">
                    <button className="lf-player__back-btn" onClick={handleBack}>
                        <span className="material-icons">arrow_back</span>
                    </button>
                    <div className="lf-player__title-area">
                        <div className="lf-player__title">{title}</div>
                        {subtitle && <div className="lf-player__subtitle">{subtitle}</div>}
                    </div>
                </div>

                {/* Bottom Controls */}
                {
                    !error && (
                        <div className="lf-player__controls">
                            {/* Progress Bar */}
                            <div
                                className="lf-player__progress"
                                onClick={handleProgressClick}
                                onMouseMove={handleProgressMouseMove}
                                onMouseLeave={handleProgressMouseLeave}
                            >
                                {/* Trickplay Thumbnail */}
                                {trickplayData && hoverTime !== null && (
                                    <div
                                        className="lf-player-scrub-preview is-visible"
                                        style={{ left: hoverX }}
                                    >
                                        <img
                                            src={jellyfinService.getTrickplayTileUrl(
                                                id,
                                                trickplayData.width,
                                                Math.floor((hoverTime * 1000) / trickplayData.interval)
                                            )}
                                            alt="Preview"
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            background: 'rgba(0,0,0,0.7)',
                                            color: '#fff',
                                            fontSize: '12px',
                                            textAlign: 'center',
                                            padding: '2px 0'
                                        }}>
                                            {formatTime(hoverTime)}
                                        </div>
                                    </div>
                                )}

                                <div className="lf-player__progress-buffered" style={{ width: `${bufferedPct}%` }} />
                                <div className="lf-player__progress-filled" style={{ width: `${progressPct}%` }} />
                                <div className="lf-player__progress-thumb" style={{ left: `${progressPct}%` }} />
                            </div>

                            {/* Controls Row */}
                            <div className="lf-player__controls-row">
                                <div className="lf-player__controls-left">
                                    {/* Play/Pause */}
                                    <button className="lf-player__ctrl-btn lf-player__ctrl-btn--play" onClick={togglePlay}>
                                        <span className="material-icons">{playing ? 'pause' : 'play_arrow'}</span>
                                    </button>

                                    {/* Skip Back/Forward */}
                                    <button className="lf-player__ctrl-btn" onClick={() => {
                                        if (videoRef.current) videoRef.current.currentTime -= 10;
                                    }}>
                                        <span className="material-icons">replay_10</span>
                                    </button>
                                    <button className="lf-player__ctrl-btn" onClick={() => {
                                        if (videoRef.current) videoRef.current.currentTime += 30;
                                    }}>
                                        <span className="material-icons">forward_30</span>
                                    </button>

                                    {/* Volume */}
                                    <div className="lf-player__volume-group">
                                        <button className="lf-player__ctrl-btn" onClick={() => {
                                            if (videoRef.current) videoRef.current.muted = !videoRef.current.muted;
                                        }}>
                                            <span className="material-icons">
                                                {muted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                                            </span>
                                        </button>
                                        <input
                                            type="range"
                                            className="lf-player__volume-slider"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={muted ? 0 : volume}
                                            onChange={handleVolumeChange}
                                        />
                                    </div>

                                    {/* Time */}
                                    <span className="lf-player__time">
                                        {formatTime(currentTime)} / {formatTime(duration)}
                                    </span>
                                </div>

                                <div className="lf-player__controls-right">
                                    {/* Fullscreen / Windowed Toggle */}
                                    <button className="lf-player__ctrl-btn" onClick={toggleWindowedMode} title={isWindowed ? "Enter Fullscreen" : "Exit Fullscreen"}>
                                        <span className="material-icons">{isWindowed ? 'fullscreen' : 'fullscreen_exit'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div>

            {/* Sidebar for Windowed Mode */}
            {
                isWindowed && item && item.Type === 'Episode' && (
                    <div className="lf-player__sidebar">
                        <div className="lf-player__metadata">
                            <h2 className="lf-player__meta-title">{item.SeriesName}</h2>
                            <h3 className="lf-player__meta-episode-title">{item.Name}</h3>
                            <div className="lf-player__meta-info">
                                <span>S{item.ParentIndexNumber} E{item.IndexNumber}</span>
                                {item.OfficialRating && <span className="lf-player__meta-rating">{item.OfficialRating}</span>}
                            </div>
                            <p className="lf-player__meta-desc">{item.Overview}</p>
                        </div>

                        <div className="lf-player__episodes-container">
                            <div className="lf-player__season-select-wrapper">
                                <select
                                    className="lf-player__season-select"
                                    value={currentSeasonId || ''}
                                    onChange={(e) => handleSeasonChange(e.target.value)}
                                >
                                    {seasons.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                </select>
                            </div>

                            <div className="lf-player__episodes-list">
                                {loadingEpisodes ? (
                                    <div className="lf-player__episodes-loading">Loading episodes...</div>
                                ) : (
                                    episodes.map(ep => (
                                        <div
                                            key={ep.Id}
                                            className={`lf-player__episode-item ${ep.Id === item.Id ? 'active' : ''}`}
                                            onClick={() => handleEpisodeClick(ep.Id)}
                                        >
                                            <div className="lf-player__episode-thumb">
                                                <img
                                                    src={jellyfinService.getImageUrl(ep, 'Primary', { maxWidth: 200 })}
                                                    alt={ep.Name}
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                                {ep.UserData?.Played && <span className="lf-player__episode-played">✓</span>}
                                            </div>
                                            <div className="lf-player__episode-details">
                                                <span className="lf-player__episode-num">E{ep.IndexNumber}</span>
                                                <span className="lf-player__episode-name">{ep.Name}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default Player;
