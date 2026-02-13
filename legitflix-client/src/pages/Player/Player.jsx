import React, { useEffect, useState, useRef } from 'react';
import { MediaPlayer, MediaProvider, Track, useMediaRemote } from '@vidstack/react';
import { useParams, useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import { useTheme } from '../../context/ThemeContext';
import Navbar from '../../components/Navbar';
import PlayerLayout from './PlayerLayout';
import JASSUB from 'jassub';
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
                    // Fix: getStreamUrl(itemId, audioIndex, subIndex, mediaSourceId)
                    const url = jellyfinService.getStreamUrl(data.Id, null, null, mediaSource.Id);
                    setStreamUrl(url);

                    // Filter Subtitles
                    const subs = mediaSource.MediaStreams.filter(s => s.Type === 'Subtitle');
                    setSubtitleStreams(subs);
                }

                // Load Seasons/Episodes if it's an episode
                if (data.Type === 'Episode' && data.SeriesId) {
                    // Fix: getSeasons(userId, seriesId)
                    const seasonsData = await jellyfinService.getSeasons(user.Id, data.SeriesId);
                    setSeasons(seasonsData);
                    setCurrentSeasonId(data.SeasonId);

                    // Fix: getEpisodes(userId, seriesId, seasonId)
                    const episodesData = await jellyfinService.getEpisodes(user.Id, data.SeriesId, data.SeasonId);
                    setEpisodes(episodesData);

                    // Find next episode
                    const currentIndex = episodesData.findIndex(e => e.Id === data.Id);
                    if (currentIndex !== -1 && currentIndex < episodesData.length - 1) {
                        setNextEpisodeId(episodesData[currentIndex + 1].Id);
                    }
                }

            } catch (error) {
                console.error("Error loading player data:", error);
            }
        };
        loadData();
    }, [id]);

    // 2. Playback Reporting
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current && !playerRef.current.state.paused) {
                const currentTime = playerRef.current.state.currentTime;
                const user = { Id: jellyfinService.currentUserId }; // Mock or fetch real user ID if needed
                if (item) {
                    jellyfinService.reportPlaybackProgress(
                        item.Id,
                        currentTime * 10000000,
                        false // isPaused
                    );
                }
            }
        }, 10000); // Report every 10s

        return () => clearInterval(interval);
    }, [item]);

    // 3. Handle ASS/SSA Subtitles
    const onTrackChange = (track) => {
        if (track && (track.type === 'ass' || track.content?.type === 'ass')) {
            const videoEl = playerRef.current?.querySelector('video');
            if (videoEl && !jassubInstance) {
                try {
                    const instance = new JASSUB({
                        video: videoEl,
                        subUrl: track.src,
                        workerUrl: '/jassub-worker.js',
                        wasmUrl: '/jassub-worker.wasm',
                        onDemand: true
                    });
                    setJassubInstance(instance);
                } catch (e) {
                    console.error("JASSUB Init Error", e);
                }
            }
        } else {
            if (jassubInstance) {
                jassubInstance.destroy();
                setJassubInstance(null);
            }
        }
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
                    autoPlay={true}
                    crossOrigin
                    onTrackChange={onTrackChange}
                    className="lf-vidstack-player"
                >
                    <MediaProvider>
                        {subtitleStreams.map(sub => (
                            <Track
                                key={sub.Index}
                                src={jellyfinService.getSubtitleUrl(item.Id, item.MediaSources[0]?.Id, sub.Index)}
                                kind="subtitles"
                                label={sub.Title || sub.Language || `Track ${sub.Index}`}
                                lang={sub.Language}
                                default={sub.IsDefault}
                            />
                        ))}
                    </MediaProvider>

                    <PlayerLayout
                        item={item}
                        chapters={chapters}
                        navigate={navigate}
                        config={config}
                        nextEpisodeId={nextEpisodeId}
                        handleNextEpisode={handleNextEpisode}
                    />
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
