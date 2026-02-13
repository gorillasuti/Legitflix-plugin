import React, { useEffect, useState, useRef } from 'react';
import { MediaPlayer, MediaProvider, Track, useMediaRemote } from '@vidstack/react';
import { useParams, useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import { useTheme } from '../../context/ThemeContext';
import Navbar from '../../components/Navbar';
import PlayerLayout from './PlayerLayout';
import PlayerSettingsModal from '../../components/PlayerSettingsModal';
import './Player.css'; // Shared CSS

const VidstackPlayer = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { config } = useTheme();
    const playerRef = useRef(null);

    // Data State
    const [item, setItem] = useState(null);
    const [streamUrl, setStreamUrl] = useState(null);
    const [subtitleStreams, setSubtitleStreams] = useState([]);
    const [chapters, setChapters] = useState([]);
    const [jassubInstance, setJassubInstance] = useState(null);
    const [episodes, setEpisodes] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [currentSeasonId, setCurrentSeasonId] = useState(null);
    const [nextEpisodeId, setNextEpisodeId] = useState(null);
    const [isFavorite, setIsFavorite] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

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
    const [maxBitrate, setMaxBitrate] = usePersistentState('maxBitrate', null); // Default Auto
    const [playbackRate, setPlaybackRate] = usePersistentState('playbackRate', 1);
    const [autoPlay, setAutoPlay] = usePersistentState('autoPlay', true);
    const [autoSkipIntro, setAutoSkipIntro] = usePersistentState('autoSkipIntro', false);
    const [autoSkipOutro, setAutoSkipOutro] = usePersistentState('autoSkipOutro', false);

    // Local/Ephemeral State
    const [audioStreams, setAudioStreams] = useState([]);
    const [selectedAudioIndex, setSelectedAudioIndex] = useState(null);
    const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(null);

    // 1. Fetch Data
    useEffect(() => {
        const loadData = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                const data = await jellyfinService.getItemDetails(user.Id, id);
                setItem(data);
                setChapters(data.Chapters || []);
                setIsFavorite(data.UserData?.IsFavorite || false);

                // Setup Stream URL
                if (data.MediaSources && data.MediaSources.length > 0) {
                    const mediaSource = data.MediaSources[0];
                    // Filter Subtitles & Audio
                    const subs = mediaSource.MediaStreams.filter(s => s.Type === 'Subtitle');
                    const audios = mediaSource.MediaStreams.filter(s => s.Type === 'Audio');
                    setSubtitleStreams(subs);
                    setAudioStreams(audios);

                    // Set Defaults
                    // Only set defaults if not already selected (to avoid overriding user choice on soft reload if we had that)
                    // But here we load once.
                    let subIndex = selectedSubtitleIndex;
                    if (subIndex === null) {
                        const defSub = subs.find(s => s.IsDefault);
                        if (defSub) {
                            subIndex = defSub.Index;
                            setSelectedSubtitleIndex(defSub.Index);
                        }
                    }

                    let audioIndex = selectedAudioIndex;
                    if (audioIndex === null) {
                        const defAudio = audios.find(s => s.IsDefault) || audios[0];
                        if (defAudio) {
                            audioIndex = defAudio.Index;
                            setSelectedAudioIndex(defAudio.Index);
                        }
                    }

                    // Native Jellyfin Way: Pass Audio AND Subtitle index to the HLS URL.
                    // This forces the server to mix them in (burn-in or HLS segments)
                    const url = jellyfinService.getStreamUrl(data.Id, audioIndex, subIndex, mediaSource.Id, maxBitrate);
                    console.log("[Player] Stream URL:", url);
                    setStreamUrl(url);
                }

                // Load Seasons/Episodes if it's an episode
                if (data.Type === 'Episode' && data.SeriesId) {
                    const seasonsData = await jellyfinService.getSeasons(user.Id, data.SeriesId);
                    setSeasons(seasonsData);
                    setCurrentSeasonId(data.SeasonId);

                    const episodesData = await jellyfinService.getEpisodes(user.Id, data.SeriesId, data.SeasonId);
                    const sortedEpisodes = episodesData.sort((a, b) => (a.IndexNumber || 0) - (b.IndexNumber || 0));
                    setEpisodes(sortedEpisodes);

                    const currentIndex = sortedEpisodes.findIndex(e => e.Id === data.Id);

                    if (currentIndex !== -1 && currentIndex < sortedEpisodes.length - 1) {
                        setNextEpisodeId(sortedEpisodes[currentIndex + 1].Id);
                    } else if (seasonsData.length > 0) {
                        const sortedSeasons = seasonsData.sort((a, b) => (a.IndexNumber || 0) - (b.IndexNumber || 0));
                        const currentSeasonIndex = sortedSeasons.findIndex(s => s.Id === data.SeasonId);

                        if (currentSeasonIndex !== -1 && currentSeasonIndex < sortedSeasons.length - 1) {
                            const nextSeason = sortedSeasons[currentSeasonIndex + 1];
                            const nextEpisodes = await jellyfinService.getEpisodes(user.Id, data.SeriesId, nextSeason.Id);
                            if (nextEpisodes.length > 0) {
                                nextEpisodes.sort((a, b) => (a.IndexNumber || 0) - (b.IndexNumber || 0));
                                setNextEpisodeId(nextEpisodes[0].Id);
                            }
                        }
                    }
                }

            } catch (error) {
                console.error("Error loading player data:", error);
            }
        };
        loadData();
    }, [id, maxBitrate]);

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
        }, 10000);

        return () => clearInterval(interval);
    }, [item]);


    const onTrackChange = (track) => {
        // Native handling
    };

    const handleNextEpisode = () => {
        if (nextEpisodeId) {
            navigate(`/player/${nextEpisodeId}`);
        }
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

    if (!streamUrl) return <div className="loading-txt">Loading LegitFlix Player...</div>;

    return (
        <div className="lf-player-page">
            <Navbar alwaysFilled={true} />

            <div className="lf-player-video-container">
                <MediaPlayer
                    ref={playerRef}
                    src={{
                        src: streamUrl,
                        type: 'application/x-mpegurl'
                    }}
                    title={item?.Name}
                    autoPlay={autoPlay}
                    crossOrigin
                    onTrackChange={onTrackChange}
                    className="lf-vidstack-player"
                    onCanPlay={() => {
                        if (playerRef.current) playerRef.current.playbackRate = playbackRate;
                    }}
                >
                    <MediaProvider>
                        {/* 
                            With server-side subtitles (burned in or HLS stream), we generally don't need to manually map Tracks 
                            UNLESS we want to support switching without stream reload for text-based subs.
                            But sticking to "Native" robust way often means letting the stream handle it.
                            We will keep the Track setup for potential VTTs that come through separate from the burned stream,
                            but ideally if we select an index in the URL, we shouldn't double add it.
                            For now, keeping them doesn't hurt as long as they don't auto-show. 
                        */}
                    </MediaProvider>

                    <PlayerLayout
                        item={item}
                        chapters={chapters}
                        navigate={navigate}
                        config={config}
                        nextEpisodeId={nextEpisodeId}
                        handleNextEpisode={handleNextEpisode}
                        onSettingsClick={() => setShowSettings(true)}
                        autoSkipIntro={autoSkipIntro}
                        autoSkipOutro={autoSkipOutro}
                    />

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
                            onSelectAudio={(idx) => {
                                setSelectedAudioIndex(idx);
                                if (item && item.MediaSources) {
                                    // RELOAD STREAM on Audio Change
                                    const mediaSourceId = item.MediaSources[0].Id;
                                    const newUrl = jellyfinService.getStreamUrl(item.Id, idx, selectedSubtitleIndex, mediaSourceId, maxBitrate);
                                    setStreamUrl(newUrl);
                                }
                            }}
                            subtitleStreams={subtitleStreams}
                            selectedSubtitleIndex={selectedSubtitleIndex}
                            onSelectSubtitle={(idx) => {
                                setSelectedSubtitleIndex(idx);
                                if (item && item.MediaSources) {
                                    // RELOAD STREAM on Subtitle Change (Native Way)
                                    const mediaSourceId = item.MediaSources[0].Id;
                                    const newUrl = jellyfinService.getStreamUrl(item.Id, selectedAudioIndex, idx, mediaSourceId, maxBitrate);
                                    setStreamUrl(newUrl);
                                }
                            }}
                            onOpenSubtitleSearch={() => { }}
                            onDeleteSubtitle={() => { }}
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
                            updateConfig={async () => {
                                // Save Server-Side Preferences (Language)
                                try {
                                    const user = await jellyfinService.getCurrentUser();

                                    // Find selected streams to get languages
                                    const audio = audioStreams.find(s => s.Index === selectedAudioIndex);
                                    const sub = subtitleStreams.find(s => s.Index === selectedSubtitleIndex);

                                    const config = {};
                                    if (audio && audio.Language) config.AudioLanguagePreference = audio.Language;
                                    if (sub && sub.Language) {
                                        config.SubtitleLanguagePreference = sub.Language;
                                        config.SubtitleMode = 'Always';
                                    } else if (selectedSubtitleIndex === null) {
                                        config.SubtitleMode = 'None';
                                    }

                                    if (Object.keys(config).length > 0) {
                                        console.log("[Player] Saving user config:", config);
                                        await jellyfinService.updateUserConfiguration(user.Id, config);
                                    }
                                } catch (e) {
                                    console.error("Failed to save user config", e);
                                }
                            }}
                        />
                    )}
                </MediaPlayer>
            </div>

            {/* --- Metadata & Episodes (Ported from old Player.jsx) --- */}
            {item && item.Type === 'Episode' && (
                <div className="lf-player-content-container">
                    {/* Left Column: Metadata */}
                    <div className="lf-player-column-left">
                        <div className="lf-player-header-row">
                            <div className="lf-player-title-block">
                                <h4 className="lf-series-link" onClick={() => navigate(`/series/${item.SeriesId}`)}>
                                    {item.SeriesName}
                                </h4>
                                <h1 className="lf-episode-name">E{item.IndexNumber} - {item.Name}</h1>
                            </div>
                            <div className="lf-player-actions">
                                <button className={`lf-action-btn ${isFavorite ? 'is-active' : ''}`} onClick={toggleFavorite}>
                                    <span className="material-icons">{isFavorite ? 'bookmark' : 'bookmark_border'}</span>
                                </button>
                            </div>
                        </div>
                        <div className="lf-player-tags-row">
                            {item.OfficialRating && <span className="lf-tag-rating">{item.OfficialRating}</span>}
                            <span className="lf-tag-text">Sub | Dub</span>
                        </div>
                        <div className="lf-player-metadata">
                            <h1>{item.Name}</h1>
                            <p className="lf-player-description">{item.Overview}</p>
                        </div>
                    </div>

                    {/* Right Column: Episodes */}
                    <div className="lf-player-column-right">
                        <div className="lf-player-episodes-panel">
                            <div className="lf-episodes-panel-header">
                                <span className="lf-panel-title">Episodes</span>
                            </div>
                            <div className="lf-episodes-grid">
                                {episodes.map(ep => (
                                    <div key={ep.Id} className={`lf-episode-card-small ${ep.Id === item.Id ? 'current' : ''}`} onClick={() => navigate(`/player/${ep.Id}`)}>
                                        <div className="ep-card-img">
                                            <img src={jellyfinService.getImageUrl(ep, 'Primary', { maxWidth: 300 })} alt={ep.Name} onError={(e) => e.target.style.display = 'none'} />
                                        </div>
                                        <div className="ep-card-info">
                                            <div className="ep-card-title"><span className="ep-prefix">E{ep.IndexNumber}</span> - {ep.Name}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VidstackPlayer;
