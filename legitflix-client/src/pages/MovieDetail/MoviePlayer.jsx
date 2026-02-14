import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MediaPlayer, MediaProvider, useMediaRemote } from '@vidstack/react';
// import { useParams, useNavigate } from 'react-router-dom'; // No useParams/Navigate needed for embedded unless back button logic
import { jellyfinService } from '../../services/jellyfin';
import { useTheme } from '../../context/ThemeContext';
// import Navbar from '../../components/Navbar'; // No Navbar in embedded
import PlayerLayout from '../../pages/Player/PlayerLayout';
import PlayerSettingsModal from '../../components/PlayerSettingsModal';
import SubtitleModal from '../../components/SubtitleModal';
import '../../pages/Player/Player.css'; // Shared CSS

const MoviePlayer = ({ itemId, forceAutoPlay = false }) => {
    // const { id } = useParams(); // Use prop
    const id = itemId;
    // const navigate = useNavigate(); // Maybe used for next episode or back, but in embedded we might not need it?
    // Let's keep it if PlayerLayout needs it, or stub it.
    // Actually PlayerLayout uses navigate for Back button.
    // For embedded, maybe "Back" just scrolls up? Or we hide the back button?
    // Let's pass a dummy navigate or one that smooth scrolls to top.
    const navigate = (path) => {
        console.log("Navigate called in embedded player:", path);
        // If path is back to series... scanning code... it's just back btn.
        // We can hide back btn via CSS or prop.
    };

    const { config } = useTheme();
    const playerRef = useRef(null);
    const resumeTimeRef = useRef(0);

    // Media State for UI
    const [isBuffering, setIsBuffering] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Data State
    const [item, setItem] = useState(null);
    const [streamUrl, setStreamUrl] = useState(null);
    const [subtitleStreams, setSubtitleStreams] = useState([]);
    const [chapters, setChapters] = useState([]);
    // const [jassubInstance, setJassubInstance] = useState(null); // Not used direct
    // Movie specific: No episodes/seasons
    // const [episodes, setEpisodes] = useState([]);
    // const [seasons, setSeasons] = useState([]);
    // const [currentSeasonId, setCurrentSeasonId] = useState(null);
    // const [nextEpisodeId, setNextEpisodeId] = useState(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isPlayed, setIsPlayed] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showSubtitleSearch, setShowSubtitleSearch] = useState(false);
    const [trickplayUrl, setTrickplayUrl] = useState(null);
    const [backdropUrl, setBackdropUrl] = useState(null);

    // Auto-hide controls & cursor
    const [controlsVisible, setControlsVisible] = useState(true);
    const hideTimerRef = useRef(null);
    const isPausedRef = useRef(false);

    // Initial Load - Get Item & Streams
    useEffect(() => {
        // ... (existing item loading logic)
    }, [id, config]);

    // Trickplay (Thumbnails) Loading
    useEffect(() => {
        if (!item?.Id || !item?.Trickplay) return;

        let vttUrl = null;

        const loadTrickplay = async () => {
            // Clean up previous
            if (trickplayUrl) URL.revokeObjectURL(trickplayUrl);
            setTrickplayUrl(null);

            try {
                // Start by checking if item.Trickplay is already the manifest
                let manifest = item.Trickplay;

                // If it's just a boolean or empty, try fetching (but handle 404 gracefully)
                if (!manifest || (typeof manifest === 'boolean')) {
                    manifest = await jellyfinService.getTrickplayManifest(item.Id);
                }

                if (manifest && typeof manifest === 'object' && Object.keys(manifest).length > 0) {
                    let options = Object.values(manifest);
                    // ... rest of logic ...
                    if (!options.length && Array.isArray(manifest)) options = manifest;

                    options = options.sort((a, b) => a.Width - b.Width);
                    const bestOption = options.find(o => o.Width >= 320) || options[options.length - 1];

                    if (bestOption) {
                        const { Width, Interval, ThumbnailCount } = bestOption;
                        let vttContent = 'WEBVTT\n\n';

                        for (let i = 0; i < ThumbnailCount; i++) {
                            const start = i * Interval;
                            const end = (i + 1) * Interval;

                            const formatTime = (ms) => {
                                const totalSeconds = Math.floor(ms / 1000);
                                const hh = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
                                const mm = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
                                const ss = (totalSeconds % 60).toString().padStart(2, '0');
                                const mmm = (ms % 1000).toString().padStart(3, '0');
                                return `${hh}:${mm}:${ss}.${mmm}`;
                            };

                            const imgUrl = jellyfinService.getTrickplayTileUrl(item.Id, Width, i);
                            vttContent += `${formatTime(start)} --> ${formatTime(end)}\n`;
                            vttContent += `${imgUrl}\n\n`;
                        }

                        const blob = new Blob([vttContent], { type: 'text/vtt' });
                        vttUrl = URL.createObjectURL(blob);
                        setTrickplayUrl(vttUrl);
                    }
                }
            } catch (e) {
                console.warn("Failed to load trickplay", e);
            }
        };

        loadTrickplay();

        return () => {
            if (vttUrl) URL.revokeObjectURL(vttUrl);
        };
    }, [item?.Id]);

    // Helper for persistent state
    const usePersistentState = (key, defaultValue) => {
        const [state, setState] = useState(() => {
            try {
                const stored = localStorage.getItem(`legitflix_${key}`);
                return stored !== null ? JSON.parse(stored) : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        });
        useEffect(() => {
            localStorage.setItem(`legitflix_${key}`, JSON.stringify(state));
        }, [key, state]);
        return [state, setState];
    };

    // Settings State (Persistent)
    const [settingsTab, setSettingsTab] = useState('General');
    const [maxBitrate, setMaxBitrate] = usePersistentState('maxBitrate', null);
    const [playbackRate, setPlaybackRate] = usePersistentState('playbackRate', 1);
    const [autoPlay, setAutoPlay] = usePersistentState('autoPlay', true); // Maybe false for embedded?
    const [autoSkipIntro, setAutoSkipIntro] = usePersistentState('autoSkipIntro', false);
    const [autoSkipOutro, setAutoSkipOutro] = usePersistentState('autoSkipOutro', false);
    const [preferredAudioLang, setPreferredAudioLang] = usePersistentState('preferredAudioLang', null);
    const [preferredSubtitleLang, setPreferredSubtitleLang] = usePersistentState('preferredSubtitleLang', null);

    // Local/Ephemeral State
    const [audioStreams, setAudioStreams] = useState([]);
    const [selectedAudioIndex, setSelectedAudioIndex] = useState(null);
    const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(null);

    // Reset ephemeral state when navigating to a new item
    useEffect(() => {
        setSelectedAudioIndex(null);
        setSelectedSubtitleIndex(null);
        setStreamUrl(null);
        setItem(null);
        // setNextEpisodeId(null);
        setSubtitleStreams([]);
        setAudioStreams([]);
        setChapters([]);
        // setEpisodes([]);
    }, [id]);

    // Auto-hide controls - resetHideTimer
    const resetHideTimer = useCallback(() => {
        setControlsVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
            if (!isPausedRef.current) setControlsVisible(false);
        }, 3000);
    }, []);

    // Clean up timer on unmount
    useEffect(() => {
        return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
    }, []);


    // 1. Fetch Data
    useEffect(() => {
        const loadData = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                const data = await jellyfinService.getItemDetails(user.Id, id);
                setItem(data);
                setItem(data);
                setChapters(data.Chapters || []);
                setIsFavorite(data.UserData?.IsFavorite || false);
                setIsPlayed(data.UserData?.Played || false);

                if (data.BackdropImageTags && data.BackdropImageTags.length > 0) {
                    setBackdropUrl(jellyfinService.getImageUrl(data, 'Backdrop', { maxWidth: 1920, quality: 80 }));
                }

                // Initialize Resume Time
                if (data.UserData?.PlaybackPositionTicks) {
                    resumeTimeRef.current = data.UserData.PlaybackPositionTicks / 10000000;
                    console.log(`[Player] Initial resume time set to: ${resumeTimeRef.current}s`);
                }

                // Setup Stream URL
                if (data.MediaSources && data.MediaSources.length > 0) {
                    const mediaSource = data.MediaSources[0];
                    // Filter Subtitles & Audio
                    const subs = mediaSource.MediaStreams.filter(s => s.Type === 'Subtitle');
                    const audios = mediaSource.MediaStreams.filter(s => s.Type === 'Audio');
                    setSubtitleStreams(subs);
                    setAudioStreams(audios);

                    // Set Defaults
                    let subIndex = selectedSubtitleIndex;
                    if (subIndex === null) {
                        let defSub = null;
                        if (preferredSubtitleLang) {
                            defSub = subs.find(s => s.Language === preferredSubtitleLang);
                        }
                        if (!defSub) {
                            defSub = subs.find(s => s.IsDefault);
                        }
                        if (defSub) {
                            subIndex = defSub.Index;
                            setSelectedSubtitleIndex(defSub.Index);
                        } else if (subs.length > 0) {
                            subIndex = subs[0].Index;
                            setSelectedSubtitleIndex(subs[0].Index);
                        }
                    }

                    let audioIndex = selectedAudioIndex;
                    if (audioIndex === null) {
                        let defAudio = null;
                        if (preferredAudioLang) {
                            defAudio = audios.find(s => s.Language === preferredAudioLang);
                        }
                        if (!defAudio) {
                            defAudio = audios.find(s => s.IsDefault) || audios[0];
                        }
                        if (defAudio) {
                            audioIndex = defAudio.Index;
                            setSelectedAudioIndex(defAudio.Index);
                        }
                    }

                    console.log(`[Player] Subs found: ${subs.length}, Selected sub index: ${subIndex}, Audio index: ${audioIndex}`);
                    const url = jellyfinService.getStreamUrl(data.Id, audioIndex, subIndex, mediaSource.Id, maxBitrate);
                    console.log(`[Player] Stream URL:`, url);
                    setStreamUrl(url);
                }

            } catch (error) {
                console.error("Error loading player data:", error);
            }
        };
        loadData();
    }, [id, maxBitrate]); // Reload stream if bitrate changes

    // 2. Playback Reporting
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current && !playerRef.current.paused) {
                const currentTime = playerRef.current.currentTime;
                if (item && !isNaN(currentTime)) {
                    const mediaSourceId = item.MediaSources?.[0]?.Id;
                    jellyfinService.reportPlaybackProgress(
                        item.Id,
                        Math.floor(currentTime * 10000000),
                        false, // isPaused
                        mediaSourceId
                    );
                }
            }
        }, 10000); // Report every 10s

        return () => clearInterval(interval);
    }, [item]);


    const onTrackChange = (track) => {
        // Native handling
    };

    const toggleFavorite = async () => {
        if (!item) return;
        try {
            const user = await jellyfinService.getCurrentUser();
            const newFav = !isFavorite;
            await jellyfinService.markFavorite(user.Id, item.Id, newFav);
            setIsFavorite(newFav);
        } catch (err) {
            console.error("Favorite toggle failed", err);
        }
    };


    const togglePlayed = async () => {
        if (!item) return;
        try {
            const user = await jellyfinService.getCurrentUser();
            const newPlayed = !isPlayed;
            await jellyfinService.markPlayed(user.Id, item.Id, newPlayed);
            setIsPlayed(newPlayed);
        } catch (err) {
            console.error("Played toggle failed", err);
        }
    };

    if (!streamUrl) {
        return (
            <div className="lf-movie-player-embedded">
                <div className="lf-player-video-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'black', height: '100%' }}>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="lf-movie-player-embedded" style={{ width: '100%', height: '100%', background: 'black' }}>
            <div
                className={`lf-player-video-container ${!controlsVisible ? 'hide-cursor' : ''} ${isFullscreen ? 'is-fullscreen' : ''}`}
                onMouseMove={resetHideTimer}
                style={!isFullscreen ? { height: '100%', maxHeight: 'none' } : {}}
            >
                {/* Buffering Spinner Overlay */}
                {isBuffering && (
                    <div className="lf-player-loader">
                        <div className="spinner"></div>
                    </div>
                )}

                <MediaPlayer
                    ref={playerRef}
                    src={{
                        src: streamUrl,
                        type: 'application/x-mpegurl'
                    }}
                    title={item?.Name}
                    autoPlay={forceAutoPlay} // Respond to explicit autoplay request
                    onAutoPlay={(detail) => {
                        console.log("[Player] Autoplay started", detail);
                        setIsBuffering(false);
                        isPausedRef.current = false;
                        resetHideTimer();
                    }}
                    onAutoPlayFail={(detail) => {
                        console.warn("[Player] Autoplay failed", detail);
                        setIsBuffering(false);
                        isPausedRef.current = true;
                        setControlsVisible(true);
                    }}
                    crossOrigin
                    onFullscreenChange={setIsFullscreen}
                    onTrackChange={onTrackChange}
                    className="lf-vidstack-player"
                    // Buffering / Loading State Handlers
                    onWaiting={() => setIsBuffering(true)}
                    onStalled={() => setIsBuffering(true)}
                    onSeeking={() => setIsBuffering(true)}
                    onPlaying={() => {
                        setIsBuffering(false);
                        isPausedRef.current = false;
                        resetHideTimer();
                    }}
                    onCanPlay={() => {
                        setIsBuffering(false);
                    }}
                    onLoadedData={() => {
                        setIsBuffering(false);
                        if (playerRef.current) {
                            playerRef.current.playbackRate = playbackRate;

                            // Handle Resume / Seek
                            if (resumeTimeRef.current > 0) {
                                console.log(`[Player] Resuming playback at ${resumeTimeRef.current}s`);
                                playerRef.current.currentTime = resumeTimeRef.current;
                                resumeTimeRef.current = 0; // Clear after seek
                            }

                            // Force autoPlay logic if desired, but for embedded maybe manual start is safer UX
                            // OR we check if user just navigated here.
                            // If autoPlay setting is true, maybe we should play?
                            if (autoPlay) {
                                // playerRef.current.play().catch(() => { });
                            }
                        }
                    }}
                    onError={(e) => {
                        console.error("Player Error:", e);
                        setIsBuffering(false);
                    }}
                >
                    <MediaProvider>
                        {/* Subtitles are handled server-side via SubtitleStreamIndex in the stream URL */}
                    </MediaProvider>

                    <PlayerLayout
                        item={item}
                        chapters={chapters}
                        navigate={navigate}
                        config={config}
                        nextEpisodeId={null}
                        handleNextEpisode={null}
                        onSettingsClick={() => setShowSettings(true)}
                        autoSkipIntro={autoSkipIntro}
                        autoSkipOutro={autoSkipOutro}
                        controlsVisible={controlsVisible}
                        onPausedChange={(paused) => {
                            isPausedRef.current = paused;
                            if (paused) {
                                setControlsVisible(true);
                                if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
                            } else {
                                resetHideTimer();
                            }
                        }}
                        trickplayUrl={trickplayUrl}
                        backdropUrl={backdropUrl}
                        isMovie={true}
                        isPlayed={isPlayed}
                        onTogglePlayed={togglePlayed}
                    />

                    {showSettings && (
                        <PlayerSettingsModal
                            isOpen={showSettings}
                            onClose={() => setShowSettings(false)}
                            settingsTab={settingsTab}
                            setSettingsTab={setSettingsTab}
                            maxBitrate={maxBitrate}
                            setMaxBitrate={(bitrate) => {
                                if (playerRef.current) resumeTimeRef.current = playerRef.current.currentTime;
                                setMaxBitrate(bitrate);
                            }}
                            audioStreams={audioStreams}
                            selectedAudioIndex={selectedAudioIndex}
                            onSelectAudio={(idx) => {
                                setSelectedAudioIndex(idx);
                                const selectedStream = audioStreams.find(s => s.Index === idx);
                                if (selectedStream && selectedStream.Language) {
                                    setPreferredAudioLang(selectedStream.Language);
                                }
                                if (item && item.MediaSources) {
                                    const mediaSourceId = item.MediaSources[0].Id;
                                    if (playerRef.current) resumeTimeRef.current = playerRef.current.currentTime;
                                    const newUrl = jellyfinService.getStreamUrl(item.Id, idx, selectedSubtitleIndex, mediaSourceId, maxBitrate);
                                    setStreamUrl(newUrl);
                                }
                            }}
                            subtitleStreams={subtitleStreams}
                            selectedSubtitleIndex={selectedSubtitleIndex}
                            onSelectSubtitle={(idx) => {
                                setSelectedSubtitleIndex(idx);
                                if (item && item.MediaSources) {
                                    const mediaSourceId = item.MediaSources[0].Id;
                                    if (playerRef.current) resumeTimeRef.current = playerRef.current.currentTime;
                                    const newUrl = jellyfinService.getStreamUrl(item.Id, selectedAudioIndex, idx, mediaSourceId, maxBitrate);
                                    console.log(`[Player] Subtitle changed to index ${idx}, reloading stream`);
                                    setStreamUrl(newUrl);

                                    const selectedStream = subtitleStreams.find(s => s.Index === idx);
                                    if (selectedStream && selectedStream.Language) {
                                        setPreferredSubtitleLang(selectedStream.Language);
                                    }
                                }
                            }}
                            onOpenSubtitleSearch={() => {
                                setShowSettings(false);
                                setShowSubtitleSearch(true);
                            }}
                            onDeleteSubtitle={async (index) => {
                                try {
                                    await jellyfinService.deleteSubtitle(item.Id, index);
                                    await jellyfinService.refreshItem(item.Id);
                                    const user = await jellyfinService.getCurrentUser();
                                    const data = await jellyfinService.getItemDetails(user.Id, id);
                                    setItem(data);
                                    if (data.MediaSources && data.MediaSources.length > 0) {
                                        const mediaSource = data.MediaSources[0];
                                        const subs = mediaSource.MediaStreams.filter(s => s.Type === 'Subtitle');
                                        setSubtitleStreams(subs);
                                        if (selectedSubtitleIndex === index) {
                                            setSelectedSubtitleIndex(null);
                                            const mediaSourceId = mediaSource.Id;
                                            const newUrl = jellyfinService.getStreamUrl(item.Id, selectedAudioIndex, null, mediaSourceId, maxBitrate);
                                            setStreamUrl(newUrl);
                                        }
                                    }
                                } catch (e) {
                                    console.error("Failed to delete subtitle from Player Settings", e);
                                    alert("Failed to delete subtitle.");
                                }
                            }}
                            playbackRate={playbackRate}
                            setPlaybackRate={(rate) => {
                                setPlaybackRate(rate);
                                if (playerRef.current) playerRef.current.playbackRate = rate;
                            }}
                            autoPlay={autoPlay}
                            setAutoPlay={setAutoPlay}
                            autoSkipIntro={autoSkipIntro}
                            setAutoSkipIntro={setAutoSkipIntro}
                            autoSkipOutro={autoSkipOutro}
                            setAutoSkipOutro={setAutoSkipOutro}
                            updateConfig={async (overrides = {}) => {
                                try {
                                    const user = await jellyfinService.getCurrentUser();
                                    const audioIdx = overrides.audioIndex !== undefined ? overrides.audioIndex : selectedAudioIndex;
                                    const subIdx = overrides.subtitleIndex !== undefined ? overrides.subtitleIndex : selectedSubtitleIndex;
                                    const audio = audioStreams.find(s => s.Index === audioIdx);
                                    const sub = subtitleStreams.find(s => s.Index === subIdx);
                                    const config = {};
                                    if (audio && audio.Language) config.AudioLanguagePreference = audio.Language;
                                    if (sub && sub.Language) {
                                        config.SubtitleLanguagePreference = sub.Language;
                                        config.SubtitleMode = 'Always';
                                    } else if (selectedSubtitleIndex === null) {
                                        config.SubtitleMode = 'None';
                                    }
                                    if (Object.keys(config).length > 0) {
                                        await jellyfinService.updateUserConfiguration(user.Id, config);
                                    }
                                } catch (e) {
                                    console.error("Failed to save user config", e);
                                }
                            }}
                        />
                    )}
                </MediaPlayer>

                {/* Subtitle Search Modal */}
                {showSubtitleSearch && (
                    <SubtitleModal
                        isOpen={showSubtitleSearch}
                        onClose={() => setShowSubtitleSearch(false)}
                        seriesId={item?.SeriesId} // Likely undefined for Movie? Actually Movie has no SeriesId usually.
                        initialSeasonId={null}
                        initialEpisodeId={item?.Id}
                        isMovie={true}
                        onSubtitleDownloaded={async () => {
                            setShowSubtitleSearch(false);
                            try {
                                await jellyfinService.refreshItem(id);
                                const user = await jellyfinService.getCurrentUser();
                                const data = await jellyfinService.getItemDetails(user.Id, id);
                                setItem(data);
                                if (data.MediaSources && data.MediaSources.length > 0) {
                                    const mediaSource = data.MediaSources[0];
                                    const subs = mediaSource.MediaStreams.filter(s => s.Type === 'Subtitle');
                                    setSubtitleStreams(subs);
                                }
                            } catch (err) {
                                console.error('Failed to refresh item after subtitle download:', err);
                            }
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default MoviePlayer;
