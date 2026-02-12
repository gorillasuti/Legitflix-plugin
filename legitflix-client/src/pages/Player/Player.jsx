
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { useParams, useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import { useTheme } from '../../context/ThemeContext';
import Navbar from '../../components/Navbar';
import PlayerSettingsModal from '../../components/PlayerSettingsModal';
import SubtitleModal from '../../components/SubtitleModal';
import './Player.css';

const Player = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { config, updateConfig } = useTheme();
    const videoRef = useRef(null);
    const containerRef = useRef(null);

    // Player State
    const [isPlaying, setIsPlaying] = useState(true);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showControls, setShowControls] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [autoPlay, setAutoPlay] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [settingsTab, setSettingsTab] = useState('Quality');
    const [maxBitrate, setMaxBitrate] = useState(null);
    const [showSubtitleSearch, setShowSubtitleSearch] = useState(false);

    const [item, setItem] = useState(null);
    const [mediaSourceId, setMediaSourceId] = useState(null);
    const [playbackUrl, setPlaybackUrl] = useState(null);
    // { x, y, totalWidth, totalHeight }
    const [hoverTime, setHoverTime] = useState(null);
    const [hoverPosition, setHoverPosition] = useState(0);
    const [isHoveringTimeline, setIsHoveringTimeline] = useState(false);
    const [thumbnailUrl, setThumbnailUrl] = useState(null);

    // Season/Episode State
    const [seasons, setSeasons] = useState([]);
    const [currentSeasonId, setCurrentSeasonId] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [episodesTemplate, setEpisodesTemplate] = useState([]); // Renamed to avoid conflict if needed, but keeping 'episodes'
    const [episodesLoading, setEpisodesLoading] = useState(false);

    // Advanced Player State
    const [centerIcon, setCenterIcon] = useState(null);
    const [buffered, setBuffered] = useState(0);
    const [trickplayBgPos, setTrickplayBgPos] = useState({ x: 0, y: 0, totalWidth: 0, totalHeight: 0 });
    const [isFavorite, setIsFavorite] = useState(false);

    // Default skip times/preferences (will fall back to defaults if not in config)
    const SEEK_FORWARD_TIME = config?.player?.seekForward || 30;
    const SEEK_BACKWARD_TIME = config?.player?.seekBackward || 10;

    // Additional state not covered above
    const [audioStreams, setAudioStreams] = useState([]);
    const [subtitleStreams, setSubtitleStreams] = useState([]);
    const [selectedAudioIndex, setSelectedAudioIndex] = useState(null);
    const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(null);
    const [showSkipIntro, setShowSkipIntro] = useState(false);
    const [showSkipOutro, setShowSkipOutro] = useState(false); // Added this
    const [skipTargetTime, setSkipTargetTime] = useState(null);
    const [introStart, setIntroStart] = useState(null);
    const [introEnd, setIntroEnd] = useState(null);
    const [nextEpisodeId, setNextEpisodeId] = useState(null);

    const controlsTimeoutRef = useRef(null);
    const hlsRef = useRef(null);
    const progressInterval = useRef(null);
    const autoSkippedRef = useRef({ intro: false, outro: false });

    // --- 2. Fetch Seasons & Episodes ---
    const loadSeasons = useCallback(async (userId, seriesId, initialSeasonId) => {
        try {
            const seasonsData = await jellyfinService.getSeasons(userId, seriesId);
            setSeasons(seasonsData.Items || []);

            // Set current season (either the episode's season or the first one)
            const seasonToLoad = initialSeasonId || (seasonsData.Items?.[0]?.Id);
            setCurrentSeasonId(seasonToLoad);
        } catch (error) {
            console.error("Failed to load seasons", error);
        }
    }, []);

    // --- 3. Trickplay Logic ---
    const [trickplayInfo, setTrickplayInfo] = useState(null);

    const loadTrickplayData = useCallback(async (itemId) => {
        try {
            const manifest = await jellyfinService.getTrickplayManifest(itemId);
            if (!manifest) return;

            // Manifest format: { "MediaSourceId": { "ResolutionWidth": { TileWidth, TileHeight, Interval, ... } } }
            // Get the first media source's data
            const mediaSourceKeys = Object.keys(manifest);
            if (mediaSourceKeys.length === 0) return;

            const resolutions = manifest[mediaSourceKeys[0]];
            const resolutionKeys = Object.keys(resolutions).map(Number).sort((a, b) => a - b);
            if (resolutionKeys.length === 0) return;

            // Pick smallest resolution for performance (typically 320px wide)
            const selectedWidth = resolutionKeys[0];
            const info = resolutions[selectedWidth];

            setTrickplayInfo({
                itemId,
                width: selectedWidth,
                interval: info.Interval, // ms between frames
                tileWidth: info.TileWidth, // columns per tile image
                tileHeight: info.TileHeight, // rows per tile image
                thumbWidth: info.Width, // pixel width of each thumb
                thumbHeight: info.Height, // pixel height of each thumb
                thumbnailCount: info.ThumbnailCount
            });

            console.log('[Trickplay] Loaded:', { width: selectedWidth, interval: info.Interval, cols: info.TileWidth, rows: info.TileHeight, thumbs: info.ThumbnailCount });
        } catch (e) {
            console.warn("Failed to load trickplay data", e);
        }
    }, []);

    // --- 1. Fetch Item & Playback Info ---
    const loadItem = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const user = await jellyfinService.getCurrentUser();
            if (!user) { navigate('/login'); return; }

            const itemData = await jellyfinService.getItemDetails(user.Id, id);
            setItem(itemData);
            setIsFavorite(itemData.UserData?.IsFavorite || false);
            // Reset auto-skip tracking for new item
            if (autoSkippedRef.current) {
                autoSkippedRef.current = { intro: false, outro: false };
            }

            // --- Stream Processing ---
            if (itemData.MediaSources && itemData.MediaSources.length > 0) {
                const source = itemData.MediaSources[0];
                setMediaSourceId(source.Id);
                const streams = source.MediaStreams || [];

                const audio = streams.filter(s => s.Type === 'Audio');
                const subs = streams.filter(s => s.Type === 'Subtitle');

                setAudioStreams(audio);
                setSubtitleStreams(subs);

                // Set default/selected audio
                const defaultAudio = audio.find(s => s.Index === source.DefaultAudioStreamIndex);
                if (defaultAudio) setSelectedAudioIndex(defaultAudio.Index);
                else if (audio.length > 0) setSelectedAudioIndex(audio[0].Index);

                // Set default/selected sub
                const defaultSub = subs.find(s => s.Index === source.DefaultSubtitleStreamIndex);
                if (defaultSub) setSelectedSubtitleIndex(defaultSub.Index);
                else setSelectedSubtitleIndex(null);
            }
            setIsLoading(false);
        } catch (err) {
            console.error("Failed to load item", err);
            setError("Failed to load video.");
            setIsLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        loadItem();
    }, [loadItem]);

    const handleDeleteSubtitle = async (trackIndex) => {
        if (!window.confirm("Are you sure you want to delete this subtitle?")) return;
        try {
            await jellyfinService.deleteSubtitle(item.Id, trackIndex);
            // Refresh item data to update streams list
            loadItem();
        } catch (error) {
            console.error("Failed to delete subtitle:", error);
            alert("Failed to delete subtitle");
        }
    };



    // --- 1b. Update Playback URL when streams/quality change ---
    useEffect(() => {
        if (!item) return;

        const url = jellyfinService.getStreamUrl(
            item.Id,
            selectedAudioIndex,
            selectedSubtitleIndex,
            mediaSourceId,
            maxBitrate
        );

        // Only update if it's different to avoid re-mounting logic if not needed,
        // but getStreamUrl generates new PlaySessionId every time.
        // We should compare parameters or just let it update.
        // To prevent infinite loops or constant reloads, we trust the user interaction.
        setPlaybackUrl(url);
    }, [item, selectedAudioIndex, selectedSubtitleIndex, maxBitrate]);



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



    const handleTimelineHover = (e) => {
        if (!duration) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const time = percent * duration;

        setHoverTime(time);
        setHoverPosition(percent);
        setIsHoveringTimeline(true);

        // Calculate trickplay tile + position
        if (trickplayInfo) {
            const { itemId, width, interval, tileWidth, tileHeight } = trickplayInfo;
            const thumbsPerTile = tileWidth * tileHeight;
            const frameIndex = Math.floor((time * 1000) / interval); // Which frame overall
            const tileIndex = Math.floor(frameIndex / thumbsPerTile); // Which tile image
            const frameInTile = frameIndex % thumbsPerTile; // Position within tile

            const col = frameInTile % tileWidth;
            const row = Math.floor(frameInTile / tileWidth);

            const tileUrl = jellyfinService.getTrickplayTileUrl(itemId, width, tileIndex);
            setThumbnailUrl(tileUrl);

            // Store the background position for CSS cropping
            setTrickplayBgPos({
                x: -(col * trickplayInfo.thumbWidth),
                y: -(row * trickplayInfo.thumbHeight),
                totalWidth: tileWidth * trickplayInfo.thumbWidth,
                totalHeight: tileHeight * trickplayInfo.thumbHeight
            });
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

    // --- Subtitle Track Management ---
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Remove all existing track elements
        const existingTracks = video.querySelectorAll('track');
        existingTracks.forEach(t => t.remove());

        // Also disable any existing text tracks (HLS may add some)
        for (let i = 0; i < video.textTracks.length; i++) {
            video.textTracks[i].mode = 'disabled';
        }

        if (selectedSubtitleIndex === null || !item?.Id || !mediaSourceId) {
            console.log('[Subtitles] Subtitles off');
            return;
        }

        // Find the selected subtitle stream info
        const selectedStream = subtitleStreams.find(s => s.Index === selectedSubtitleIndex);
        if (!selectedStream) return;

        // Build subtitle URL
        const subtitleUrl = jellyfinService.getSubtitleUrl(item.Id, mediaSourceId, selectedSubtitleIndex);
        console.log('[Subtitles] Loading:', subtitleUrl, selectedStream.Language);

        // Create and add track element
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = selectedStream.Language || selectedStream.Title || 'Unknown';
        track.srclang = selectedStream.Language || 'und';
        track.src = subtitleUrl;
        track.default = true;
        video.appendChild(track);

        // Set track to showing after a brief delay to ensure it's loaded
        track.track.mode = 'showing';

    }, [selectedSubtitleIndex, item?.Id, mediaSourceId, subtitleStreams]);

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
        if (!item || !mediaSourceId) return;

        progressInterval.current = setInterval(() => {
            if (videoRef.current && !videoRef.current.paused) {
                const time = videoRef.current.currentTime;
                // Report to Jellyfin
                jellyfinService.reportPlaybackProgress(
                    item.Id,
                    Math.floor(time * 10000000),
                    false, // IsPaused
                    mediaSourceId
                ).catch(err => console.warn("Report progress failed", err));
            }
        }, 10000); // Every 10s

        return () => clearInterval(progressInterval.current);
    }, [item, mediaSourceId]);

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
                videoRef.current.play().catch(e => console.log('Play prevented:', e));
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
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
                    console.error(`Error attempting to enable full - screen mode: ${err.message} (${err.name})`);
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

    // --- Click to Play/Pause (with double-click support) ---
    const clickTimerRef = useRef(null);

    const handleVideoClick = useCallback((e) => {
        // Only block clicks on actual interactive elements, not empty overlay space
        const clickedEl = e.target;
        if (clickedEl.closest('button') || clickedEl.closest('input') || clickedEl.closest('select') ||
            clickedEl.closest('.lf-skip-btn') || clickedEl.closest('.center-play-btn') ||
            clickedEl.closest('.lf-settings-modal') || clickedEl.closest('.lf-player-back-button')) {
            return;
        }

        // Delay single-click to distinguish from double-click
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
            return; // Double-click detected, let onDoubleClick handle it
        }

        clickTimerRef.current = setTimeout(() => {
            clickTimerRef.current = null;
            if (videoRef.current) {
                if (videoRef.current.paused) {
                    videoRef.current.play().catch(e => console.log('Play prevented:', e));
                    setIsPlaying(true);
                    flashCenterIcon('play_arrow');
                } else {
                    videoRef.current.pause();
                    setIsPlaying(false);
                    flashCenterIcon('pause');
                }
            }

            // Show controls temporarily
            setShowControls(true);
            if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }, 250);
    }, [videoRef]);

    const handleDoubleClick = useCallback((e) => {
        // Only on video area, not on controls
        const clickedEl = e.target;
        if (clickedEl.closest('button') || clickedEl.closest('input') || clickedEl.closest('select') ||
            clickedEl.closest('.lf-settings-modal')) {
            return;
        }

        // Cancel single-click timer
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
        }

        // Toggle fullscreen
        toggleFullscreen();
    }, []);



    const checkForChapters = useCallback((time) => {
        if (!item?.Chapters) return;

        // Logic to find if we are in an intro
        const introChapter = item.Chapters.find(c =>
            (c.Name.toLowerCase().includes('intro') || c.Name.toLowerCase().includes('opening')) &&
            time >= (c.StartPositionTicks / 10000000) &&
            time < (c.StartPositionTicks / 10000000) + 80
        );

        if (introChapter) {
            const index = item.Chapters.indexOf(introChapter);
            const nextChapter = item.Chapters[index + 1];
            if (nextChapter) {
                const target = nextChapter.StartPositionTicks / 10000000;
                setShowSkipIntro(true);
                setSkipTargetTime(target);

                // Auto-skip intro if enabled
                if (config.autoSkipIntro && !autoSkippedRef.current.intro && videoRef.current) {
                    autoSkippedRef.current.intro = true;
                    videoRef.current.currentTime = target;
                    setCurrentTime(target);
                    flashCenterIcon('skip_next');
                    console.log('[AutoSkip] Skipped intro to', target);
                }
            } else {
                setShowSkipIntro(false);
            }
        } else {
            setShowSkipIntro(false);

            // Logic for Outro/Credits
            if (duration > 0 && (duration - time) < 120) {
                const creditChapter = item.Chapters.find(c =>
                    (c.Name.toLowerCase().includes('outro') || c.Name.toLowerCase().includes('ending') || c.Name.toLowerCase().includes('credits')) &&
                    time >= (c.StartPositionTicks / 10000000)
                );

                if (creditChapter) {
                    setShowSkipOutro(true);

                    // Auto-skip outro if enabled (go to next episode or end)
                    if (config.autoSkipOutro && !autoSkippedRef.current.outro && videoRef.current) {
                        autoSkippedRef.current.outro = true;
                        if (nextEpisodeId) {
                            navigate(`/player/${nextEpisodeId}`);
                        }
                    }
                } else {
                    setShowSkipOutro(false);
                }
            } else {
                setShowSkipOutro(false);
            }
        }
    }, [item, duration, config.autoSkipIntro, config.autoSkipOutro, nextEpisodeId, navigate]);

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
                navigate(`/ library`); // Or parent folder
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

            // Chapter-based Intro/Outro detection
            checkForChapters(t);
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

    const handleSkipOutro = () => {
        setShowSkipOutro(false);
        if (nextEpisodeId) {
            handleNextEpisode();
        } else if (videoRef.current) {
            // No next episode, jump to end
            videoRef.current.currentTime = videoRef.current.duration;
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
            navigate(`/player/${nextEpisodeId}`);
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

    const handleMouseMove = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (videoRef.current && !videoRef.current.paused) {
                setShowControls(false);
            }
        }, 3000);
    }, []);

    const handleSeasonChange = (seasonId) => {
        setCurrentSeasonId(seasonId);
    };

    const handleEpisodeClick = (epId) => {
        if (epId === item.Id) return;
        reportStop();
        navigate(`/player/${epId}`);
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
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} `;
        }
        return `${m}:${s.toString().padStart(2, '0')} `;
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
                style={{ cursor: showControls ? 'default' : 'none' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => isPlaying && setShowControls(false)}
                onClick={handleVideoClick}
                onDoubleClick={handleDoubleClick}
            >
                <div className="lf-player-video-wrapper">
                    <video
                        ref={videoRef}
                        className="lf-player-video"
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

                    {/* Skip Outro / Next Episode Button */}
                    {showSkipOutro && !showSkipIntro && (
                        <button className="lf-skip-btn" onClick={handleSkipOutro}>
                            {nextEpisodeId ? 'Next Episode' : 'Skip Credits'}
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
                            <button className="center-play-btn" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
                                <span className="material-icons">play_arrow</span>
                            </button>
                        )}

                        {/* Settings Modal */}
                        {showSettings && (
                            <PlayerSettingsModal
                                isOpen={showSettings}
                                onClose={() => setShowSettings(false)}
                                settingsTab={settingsTab}
                                setSettingsTab={setSettingsTab}
                                maxBitrate={maxBitrate}
                                setMaxBitrate={setMaxBitrate}
                                audioStreams={audioStreams}
                                selectedAudioIndex={selectedAudioIndex}
                                onSelectAudio={setSelectedAudioIndex}
                                subtitleStreams={subtitleStreams}
                                selectedSubtitleIndex={selectedSubtitleIndex}
                                onSelectSubtitle={setSelectedSubtitleIndex}
                                onOpenSubtitleSearch={() => {
                                    setShowSettings(false);
                                    setShowSubtitleSearch(true);
                                }}
                                onDeleteSubtitle={handleDeleteSubtitle}
                                playbackRate={playbackRate}
                                setPlaybackRate={setPlaybackRate}
                                autoPlay={autoPlay}
                                setAutoPlay={setAutoPlay}
                                autoSkipIntro={config?.autoSkipIntro}
                                setAutoSkipIntro={(val) => updateConfig({ autoSkipIntro: val })}
                                autoSkipOutro={config?.autoSkipOutro}
                                setAutoSkipOutro={(val) => updateConfig({ autoSkipOutro: val })}
                                updateConfig={updateConfig}
                            />
                        )}

                        {/* Subtitle Search Modal */}
                        {showSubtitleSearch && (
                            <SubtitleModal
                                isOpen={showSubtitleSearch}
                                onClose={() => setShowSubtitleSearch(false)}
                                seriesId={item?.SeriesId}
                                initialSeasonId={currentSeasonId || item?.SeasonId}
                                initialEpisodeId={item?.Id}
                                isMovie={item?.Type === 'Movie'}
                                onSubtitleDownloaded={() => {
                                    loadItem();
                                    setShowSubtitleSearch(false);
                                }}
                            />
                        )}

                        {/* Bottom Controls Bar */}
                        <div className="lf-player-controls-bottom">
                            {/* Timeline / Seek Bar */}
                            <div
                                className="lf-player-timeline-container"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const pct = (e.clientX - rect.left) / rect.width;
                                    const seekTime = pct * (duration || 0);
                                    if (videoRef.current) {
                                        videoRef.current.currentTime = seekTime;
                                        setCurrentTime(seekTime);
                                    }
                                }}
                                onMouseMove={handleTimelineHover}
                                onMouseLeave={handleTimelineLeave}
                            >
                                <div className="lf-player-timeline-track">
                                    <div className="lf-player-timeline-buffered" style={{ width: `${bufferedPct}%` }} />
                                    <div className="lf-player-timeline-fill" style={{ width: `${progressPercent}%` }}>
                                        <div className="lf-player-timeline-thumb" />
                                    </div>
                                </div>
                                {/* Hover Tooltip with Time & Trickplay Thumbnail */}
                                {isHoveringTimeline && hoverTime !== null && (
                                    <div className="lf-timeline-tooltip" style={{ left: `${hoverPosition * 100}%` }}>
                                        {thumbnailUrl && trickplayBgPos && (
                                            <div className="lf-timeline-thumbnail" style={{
                                                backgroundImage: `url(${thumbnailUrl})`,
                                                backgroundPosition: `${trickplayBgPos.x}px ${trickplayBgPos.y} px`,
                                                backgroundSize: `${trickplayBgPos.totalWidth}px ${trickplayBgPos.totalHeight} px`,
                                                width: `${trickplayInfo?.thumbWidth || 160} px`,
                                                height: `${trickplayInfo?.thumbHeight || 90} px`
                                            }} />
                                        )}
                                        <span className="lf-timeline-time">{formatTime(hoverTime)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Controls Row */}
                            <div className="lf-player-controls-row">
                                <div className="controls-left">
                                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
                                        <span className="material-icons">{isPlaying ? 'pause' : 'play_arrow'}</span>
                                    </button>
                                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); skipBackward(); }}>
                                        <span className="material-icons">replay_10</span>
                                    </button>
                                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); skipForward(); }}>
                                        <span className="material-icons">forward_30</span>
                                    </button>
                                    {nextEpisodeId && (
                                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleNextEpisode(); }} title="Next Episode">
                                            <span className="material-icons">skip_next</span>
                                        </button>
                                    )}
                                    <div className="volume-container">
                                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleMute(); }}>
                                            <span className="material-icons">
                                                {isMuted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                                            </span>
                                        </button>
                                        <div className="volume-slider-wrapper">
                                            <input
                                                type="range"
                                                className="volume-slider"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={isMuted ? 0 : volume}
                                                onChange={(e) => {
                                                    const v = parseFloat(e.target.value);
                                                    setVolume(v);
                                                    if (videoRef.current) {
                                                        videoRef.current.volume = v;
                                                        videoRef.current.muted = (v === 0);
                                                    }
                                                    setIsMuted(v === 0);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                    <span className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
                                </div>
                                <div className="controls-right">
                                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}>
                                        <span className="material-icons">settings</span>
                                    </button>
                                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}>
                                        <span className="material-icons">{document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
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
                                        onClick={() => navigate(`/series/${item.SeriesId}`)}
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

