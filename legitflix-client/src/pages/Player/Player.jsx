import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { useParams, useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import { useTheme } from '../../context/ThemeContext'; // Import useTheme
import Navbar from '../../components/Navbar';
import './Player.css';

const Player = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { config } = useTheme(); // Access global config
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

    // Data State
    const [item, setItem] = useState(null);
    const [playbackUrl, setPlaybackUrl] = useState(null);
    const [centerIcon, setCenterIcon] = useState(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isDescExpanded, setIsDescExpanded] = useState(false);

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
    const [episodesTemplate, setEpisodesTemplate] = useState([]); // Renamed to avoid conflict if needed, but keeping 'episodes'
    const [episodesLoading, setEpisodesLoading] = useState(false);

    // Advanced Player State
    const [showSettings, setShowSettings] = useState(false);


    // Default skip times/preferences (will fall back to defaults if not in config)
    const SEEK_FORWARD_TIME = config?.player?.seekForward || 30;
    const SEEK_BACKWARD_TIME = config?.player?.seekBackward || 10;
    const [audioStreams, setAudioStreams] = useState([]);
    const [subtitleStreams, setSubtitleStreams] = useState([]);
    const [selectedAudioIndex, setSelectedAudioIndex] = useState(null);
    const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(null);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [autoPlay, setAutoPlay] = useState(true);
    const [maxBitrate, setMaxBitrate] = useState(null); // null = Auto
    const [showSkipIntro, setShowSkipIntro] = useState(false);
    const [introStart, setIntroStart] = useState(null);
    const [introEnd, setIntroEnd] = useState(null);
    const [nextEpisodeId, setNextEpisodeId] = useState(null);
    const [settingsTab, setSettingsTab] = useState('Quality'); // Quality, Audio, Subtitles, Speed

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

                const itemData = await jellyfinService.getItemDetails(user.Id, id);
                setItem(itemData);

                // --- Stream Processing ---
                if (itemData.MediaSources && itemData.MediaSources.length > 0) {
                    const source = itemData.MediaSources[0];
                    const streams = source.MediaStreams || [];

                    const audio = streams.filter(s => s.Type === 'Audio');
                    const subs = streams.filter(s => s.Type === 'Subtitle');
                    setAudioStreams(audio);
                    setSubtitleStreams(subs);

                    // Set defaults if not already set (or reset on new item)
                    const defaultAudio = audio.find(s => s.IsDefault) || audio[0];
                    const defaultSub = subs.find(s => s.IsDefault) || subs.filter(s => s.IsForced)[0]; // don't auto-select subs unless default/forced

                    // Only set if we haven't manually selected for this item (simple approach: reset on load)
                    setSelectedAudioIndex(defaultAudio ? defaultAudio.Index : null);
                    setSelectedSubtitleIndex(defaultSub ? defaultSub.Index : null);
                }

                // --- Chapter/Intro Processing ---
                if (itemData.Chapters) {
                    const intro = itemData.Chapters.find(c => c.Name.toLowerCase().includes('intro') || c.Name.toLowerCase().includes('opening'));
                    if (intro) {
                        setIntroStart(intro.StartPositionTicks / 10000000);
                        // If there's a next chapter, use its start as end, else use intro end if available?
                        // Jellyfin chapters usually just have StartPositionTicks.
                        // We can look for the NEXT chapter to find the end of this one.
                        const introIndex = itemData.Chapters.indexOf(intro);
                        if (introIndex < itemData.Chapters.length - 1) {
                            setIntroEnd(itemData.Chapters[introIndex + 1].StartPositionTicks / 10000000);
                        } else {
                            // Guess 80-90s length if we can't find end? Or use image tag?
                            // Safe fallback: 90s after start
                            setIntroEnd((intro.StartPositionTicks / 10000000) + 85);
                        }
                    } else {
                        setIntroStart(null);
                        setIntroEnd(null);
                    }
                }

                // If it's an episode, fetch seasons & series info
                if (itemData.Type === 'Episode' && itemData.SeriesId) {
                    loadSeasons(user.Id, itemData.SeriesId, itemData.SeasonId);

                    try {
                        const sData = await jellyfinService.getItem(user.Id, itemData.SeriesId);
                        setIsFavorite(sData.UserData?.IsFavorite || false);
                    } catch (err) {
                        console.warn("Failed to fetch series data", err);
                    }
                }

                // Determine URL is handled in another effect dependent on state
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

    // --- 1b. Update Playback URL when streams/quality change ---
    useEffect(() => {
        if (!item) return;

        const url = jellyfinService.getStreamUrl(
            item.Id,
            selectedAudioIndex,
            selectedSubtitleIndex,
            null, // mediaSourceId
            maxBitrate
        );

        // Only update if it's different to avoid re-mounting logic if not needed,
        // but getStreamUrl generates new PlaySessionId every time.
        // We should compare parameters or just let it update.
        // To prevent infinite loops or constant reloads, we trust the user interaction.
        setPlaybackUrl(url);
    }, [item, selectedAudioIndex, selectedSubtitleIndex, maxBitrate]);

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

    // --- 2b. Determine Next Episode ---
    useEffect(() => {
        if (item && item.Type === 'Episode' && episodes.length > 0) {
            const currentIndex = episodes.findIndex(e => e.Id === item.Id);
            if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
                setNextEpisodeId(episodes[currentIndex + 1].Id);
            } else {
                setNextEpisodeId(null); // End of season or list
                // Could potentially check next season?
            }
        }
    }, [item, episodes]);

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
    }, [playbackUrl]); // Re-run when URL changes (e.g. stream switch)

    // Watch playback rate changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate]);


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

    const togglePlay = useCallback(() => {
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
    }, [videoRef]);

    const flashCenterIcon = (icon) => {
        setCenterIcon(icon);
        setTimeout(() => setCenterIcon(null), 600);
    };

    const skipForward = useCallback(() => {
        if (videoRef.current) {
            const skip = config.playerSeekForward || 30;
            videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + skip);
            setCurrentTime(videoRef.current.currentTime);
            flashCenterIcon('fast_forward');
        }
    }, [config.playerSeekForward]);

    const skipBackward = useCallback(() => {
        if (videoRef.current) {
            const skip = config.playerSeekBackward || 10;
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - skip);
            setCurrentTime(videoRef.current.currentTime);
            flashCenterIcon('fast_rewind');
        }
    }, [config.playerSeekBackward]);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            if (containerRef.current) {
                containerRef.current.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, []);

    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (video) {
            video.muted = !isMuted;
            setIsMuted(!isMuted);
            if (!isMuted) { // Was not muted, now muting
                setVolume(0);
                video.volume = 0;
            } else { // Was muted, now unmuting
                // Restore previous volume or default to 1 if it was 0
                const restoredVolume = video.volume > 0 ? video.volume : 1;
                setVolume(restoredVolume);
                video.volume = restoredVolume;
            }
        }
    }, [isMuted, videoRef]);

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    // Settings logic would go here - integrated into the player controls
    // For now we will focus on the player logic

    // --- Gesture & Keyboard Controls ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (showSettings) return; // Don't trigger if settings modal is open

            // Prevent default scrolling for Space/Arrows
            if ([' ', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }

            switch (e.key) {
                case ' ':
                case 'k':
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    skipBackward();
                    break;
                case 'ArrowRight':
                    skipForward();
                    break;
                case 'f':
                    toggleFullscreen();
                    break;
                case 'm':
                    toggleMute();
                    break;
                default:
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isPlaying, showSettings]); // Re-bind if dependencies change

    // --- Click to Play/Pause ---
    const handleVideoClick = (e) => {
        // Prevent triggering when clicking controls
        if (e.target.closest('.lf-player-controls') || e.target.closest('.lf-player-back-button')) {
            return;
        }
        togglePlay();

        // Show controls temporarily
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    // --- Skip Intro/Outro Logic ---

    const [showSkipOutro, setShowSkipOutro] = useState(false);
    const [skipTargetTime, setSkipTargetTime] = useState(null);

    const checkForChapters = useCallback((time) => {
        if (!item?.Chapters) return;

        const currentChapter = item.Chapters.find(chapter =>
            time >= (chapter.StartPositionTicks / 10000000) &&
            time < (chapter.StartPositionTicks / 10000000) + (chapter.ImageTag ? 0 : 0) // Just finding current
        );

        // Jellyfin chapters often allow identifying Intros/Outros by name
        // Common names: "Intro", "Opening", "Outro", "Ending", "Credits"

        // Logic to find if we are in an intro
        const introChapter = item.Chapters.find(c =>
            (c.Name.toLowerCase().includes('intro') || c.Name.toLowerCase().includes('opening')) &&
            time >= (c.StartPositionTicks / 10000000) &&
            time < (c.StartPositionTicks / 10000000) + 80 // Reasonable cap or use next chapter start
        );

        if (introChapter) {
            // Find end of this chapter (start of next)
            const index = item.Chapters.indexOf(introChapter);
            const nextChapter = item.Chapters[index + 1];
            if (nextChapter) {
                setShowSkipIntro(true);
                setSkipTargetTime(nextChapter.StartPositionTicks / 10000000);
            } else {
                setShowSkipIntro(false);
            }
        } else {
            setShowSkipIntro(false);

            // Logic for Outro/Credits
            // Often implicit: if we are near the end, or if chapter is named "Credits"
            if (duration > 0 && (duration - time) < 120) { // Near end
                // Check if specific chapter
                const creditChapter = item.Chapters.find(c =>
                    (c.Name.toLowerCase().includes('outro') || c.Name.toLowerCase().includes('ending') || c.Name.toLowerCase().includes('credits')) &&
                    time >= (c.StartPositionTicks / 10000000)
                );

                if (creditChapter) {
                    setShowSkipOutro(true);
                    // Target is usually "Next Episode" action, handled by the button click
                } else {
                    // Even if no chapter, if very close to end, maybe show "Next Episode" logic which we already have?
                    // For now, only show Skip Outro if explicit chapter or manually detected
                    setShowSkipOutro(false);
                }
            } else {
                setShowSkipOutro(false);
            }
        }
    }, [item, duration]);

    // Update check in timeUpdate
    // (This needs to be called in existing handleTimeUpdate or useEffect)

    // --- Back Button Logic ---
    const handleBack = () => {
        reportStop();
        if (window.history.length > 2) {
            navigate(-1);
        } else {
            // Fallback if opened directly
            if (item && item.SeriesId) {
                navigate(`/series/${item.SeriesId}`);
            } else if (item && item.ParentId) {
                navigate(`/library`); // Or parent folder
            } else {
                navigate('/');
            }
        }
    };

    const handleTimeUpdate = (e) => {
        if (videoRef.current) {
            const t = videoRef.current.currentTime;
            setCurrentTime(t);
            setDuration(videoRef.current.duration || 0);
            if (videoRef.current.buffered.length > 0) {
                setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
            }

            // Intro Skip Check
            if (introStart !== null && introEnd !== null) {
                if (t >= introStart && t < introEnd) {
                    setShowSkipIntro(true);
                } else {
                    setShowSkipIntro(false);
                }
            }
        }
    };

    const handleLoadedMetadata = () => {
        // This is where you might fetch trickplay images or other metadata
        // For now, it's a placeholder for future trickplay integration
    };

    const handleEnded = () => {
        if (autoPlay && nextEpisodeId) {
            // Maybe show a countdown? or just go.
            // For now, immediate transition after 2s
            setTimeout(() => handleNextEpisode(), 1500);
        } else {
            setIsPlaying(false);
            reportStop();
            setShowControls(true);
        }
    };

    const handleSkipIntro = () => {
        if (videoRef.current && introEnd) {
            videoRef.current.currentTime = introEnd;
            flashCenterIcon('fast_forward');
            setShowSkipIntro(false);
        }
    };

    const handleNextEpisode = () => {
        if (nextEpisodeId) {
            reportStop();
            // Reset state for new item
            setAudioStreams([]);
            setSubtitleStreams([]);
            setIntroStart(null);
            setShowSkipIntro(false);
            navigate(`/play/${nextEpisodeId}`);
        }
    };

    const handleStreamSelect = (type, index) => {
        // Save position to resume? HLS.js usually restarts or we seek.
        // The useEffect will trigger a reload.
        // Ideally we should save current time and restore it after reload.
        // jellyfin service's PlaybackPositionTicks handles some resume, but let's be safe:
        // const oldTime = videoRef.current ? videoRef.current.currentTime : 0;
        // logic moved to useEffect or rely on 'loadedmetadata' which checks getItem's PlaybackPositionTicks.
        // BUT getItem is only called on ID change.
        // So we might lose position if we don't save it.
        // Simpler implementation: We rely on the user to seek or we store it in a Ref?
        // Let's rely on standard reload behavior for now.

        if (type === 'Audio') setSelectedAudioIndex(index);
        if (type === 'Subtitle') setSelectedSubtitleIndex(index);
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

    const toggleFavorite = async () => {
        if (!item || !item.SeriesId) return;
        try {
            const user = await jellyfinService.getCurrentUser();
            const newFav = !isFavorite;
            await jellyfinService.markFavorite(user.Id, item.SeriesId, newFav);
            setIsFavorite(newFav);
        } catch (err) {
            console.error("Favorite toggle failed", err);
        }
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
        <div className="lf-player-page">
            <Navbar alwaysFilled={true} />

            {/* --- Main Video Container (Use Ref for Fullscreen) --- */}
            <div
                ref={containerRef}
                className={`lf-player-video-container ${document.fullscreenElement ? 'is-fullscreen' : ''}`}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => isPlaying && setShowControls(false)}
                onClick={handleVideoClick}
            >
                <div className="lf-player-video-wrapper" onClick={togglePlay}>
                    <video
                        ref={videoRef}
                        className="lf-player-video"
                        onClick={(e) => e.stopPropagation()} // Prevent double toggle if needed, usually handled by wrapper
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={handleEnded}
                        onWaiting={() => setIsLoading(true)}
                        onCanPlay={() => setIsLoading(false)}
                        crossOrigin="anonymous"
                    />

                    {/* Skip Intro Button */}
                    {showSkipIntro && (
                        <button className="lf-skip-btn" onClick={handleSkipIntro}>
                            Skip Intro
                        </button>
                    )}

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
                                        {item.SeriesName && item.Name && <span className="divider">|</span>}
                                        <span className="episode-title">{item.Name}</span>
                                    </>
                                ) : 'Loading...'}
                            </div>
                        </div>

                        {/* Center Play Button (Big) - displayed when paused */}
                        {!isPlaying && !isLoading && !error && !showSettings && (
                            <button className="center-play-btn" onClick={togglePlay}>
                                <span className="material-icons">play_arrow</span>
                            </button>
                        )}

                        {/* Settings Modal */}
                        {showSettings && (
                            <div className="lf-settings-modal">
                                <div className="lf-settings-header">
                                    <h3>Settings</h3>
                                    <button onClick={() => setShowSettings(false)} className="close-btn">
                                        <span className="material-icons">close</span>
                                    </button>
                                </div>
                                <div className="lf-settings-tabs">
                                    {['Quality', 'Audio', 'Subtitles', 'Speed', 'General'].map(tab => (
                                        <button
                                            key={tab}
                                            className={`tab-btn ${settingsTab === tab ? 'active' : ''}`}
                                            onClick={() => setSettingsTab(tab)}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </div>
                                <div className="lf-settings-content">
                                    {settingsTab === 'Quality' && (
                                        <div className="settings-list">
                                            <button className={!maxBitrate ? 'active' : ''} onClick={() => setMaxBitrate(null)}>Auto</button>
                                            <button className={maxBitrate === 120000000 ? 'active' : ''} onClick={() => setMaxBitrate(120000000)}>4K (120Mbps)</button>
                                            <button className={maxBitrate === 60000000 ? 'active' : ''} onClick={() => setMaxBitrate(60000000)}>1080p High (60Mbps)</button>
                                            <button className={maxBitrate === 20000000 ? 'active' : ''} onClick={() => setMaxBitrate(20000000)}>1080p (20Mbps)</button>
                                            <button className={maxBitrate === 10000000 ? 'active' : ''} onClick={() => setMaxBitrate(10000000)}>720p (10Mbps)</button>
                                        </div>
                                    )}
                                    {settingsTab === 'Audio' && (
                                        <div className="settings-list">
                                            {audioStreams.map(stream => (
                                                <button
                                                    key={stream.Index}
                                                    className={selectedAudioIndex === stream.Index ? 'active' : ''}
                                                    onClick={() => handleStreamSelect('Audio', stream.Index)}
                                                >
                                                    {stream.Language || 'Unknown'} - {stream.Codec} {stream.Title ? `(${stream.Title})` : ''}
                                                </button>
                                            ))}
                                            {audioStreams.length === 0 && <p>No audio streams found.</p>}
                                        </div>
                                    )}
                                    {settingsTab === 'Subtitles' && (
                                        <div className="settings-list">
                                            <button
                                                className={selectedSubtitleIndex === null ? 'active' : ''}
                                                onClick={() => handleStreamSelect('Subtitle', null)}
                                            >
                                                Off
                                            </button>
                                            {subtitleStreams.map(stream => (
                                                <button
                                                    key={stream.Index}
                                                    className={selectedSubtitleIndex === stream.Index ? 'active' : ''}
                                                    onClick={() => handleStreamSelect('Subtitle', stream.Index)}
                                                >
                                                    {stream.Language || 'Unknown'} {stream.Title ? `(${stream.Title})` : ''} {stream.IsForced ? '[Forced]' : ''}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {settingsTab === 'Speed' && (
                                        <div className="settings-list">
                                            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                                                <button
                                                    key={rate}
                                                    className={playbackRate === rate ? 'active' : ''}
                                                    onClick={() => setPlaybackRate(rate)}
                                                >
                                                    {rate}x
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {settingsTab === 'General' && (
                                        <div className="settings-list">
                                            <button
                                                className={autoPlay ? 'active' : ''}
                                                onClick={() => setAutoPlay(!autoPlay)}
                                            >
                                                Auto Play: {autoPlay ? 'On' : 'Off'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Content Below Player --- */}
            {
                item && item.Type === 'Episode' && (
                    <div className="lf-player-content-container">

                        {/* Left Column: Metadata */}
                        <div className="lf-player-column-left">
                            <div className="lf-player-header-row">
                                <div className="lf-player-title-block">
                                    <h4
                                        className="lf-series-link"
                                        onClick={() => navigate(/series/)}
                                    >
                                        {item.SeriesName}
                                    </h4>
                                    <h1 className="lf-episode-name">
                                        E{item.IndexNumber} - {item.Name}
                                    </h1>
                                </div>
                                <div className="lf-player-actions">
                                    <button
                                        className={`lf-action-btn ${isFavorite ? 'is-active' : ''}`}
                                        onClick={toggleFavorite}
                                        title={isFavorite ? "Remove from Watchlist" : "Add to Watchlist"}
                                    >
                                        <span className="material-icons">
                                            {isFavorite ? 'bookmark' : 'bookmark_border'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="lf-player-tags-row">
                                {item.OfficialRating && (
                                    <span className="lf-tag-rating">{item.OfficialRating}</span>
                                )}
                                <span className="lf-tag-text">Sub | Dub</span>
                                {item.PremiereDate && (
                                    <span className="lf-release-date">
                                        Released on {new Date(item.PremiereDate).toLocaleDateString()}
                                    </span>
                                )}
                            </div>

                            <div className="lf-player-metadata">
                                <h1>{item.Name}</h1>
                                <p className="lf-player-description">
                                    {item.Overview}
                                </p>
                            </div>
                        </div>

                        {/* Right Column: Episodes */}
                        <div className="lf-player-column-right">
                            <div className="lf-player-episodes-panel">
                                <div className="lf-episodes-panel-header">
                                    <span className="lf-panel-title">Episodes</span>
                                    <div className="season-select-wrapper">
                                        <select
                                            className="lf-season-dropdown"
                                            value={currentSeasonId || ''}
                                            onChange={(e) => handleSeasonChange(e.target.value)}
                                        >
                                            {seasons.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                        </select>
                                        <span className="material-icons dropdown-icon">expand_more</span>
                                    </div>
                                </div>

                                <div className="lf-episodes-grid">
                                    {episodesLoading ? (
                                        <div className="loading-txt">Loading...</div>
                                    ) : (
                                        episodes.map(ep => (
                                            <div
                                                key={ep.Id}
                                                className={`lf-episode-card-small ${ep.Id === item.Id ? 'current' : ''}`}
                                                onClick={() => handleEpisodeClick(ep.Id)}
                                            >
                                                <div className="ep-card-img">
                                                    <img
                                                        src={jellyfinService.getImageUrl(ep, 'Primary', { maxWidth: 300 })}
                                                        alt={ep.Name}
                                                        onError={(e) => e.target.style.display = 'none'}
                                                    />
                                                    {ep.Id === item.Id && <div className="ep-playing-overlay"><span className="material-icons">play_circle</span></div>}
                                                </div>
                                                <div className="ep-card-info">
                                                    <div className="ep-card-title">
                                                        <span className="ep-prefix">E{ep.IndexNumber}</span> - {ep.Name}
                                                    </div>
                                                    <div className="ep-card-meta">Sub | Dub</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Player;

