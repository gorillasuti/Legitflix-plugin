import React, { useMemo, useEffect } from 'react';
import {
    TimeSlider,
    PlayButton,
    MuteButton,
    VolumeSlider,
    FullscreenButton,
    SeekButton,
    Gesture,
    useMediaState,
    useMediaRemote
} from '@vidstack/react';
import './Player.css'; // Keep your existing CSS!

const PlayerLayout = ({
    item,
    chapters,
    navigate,
    config,
    nextEpisodeId,
    handleNextEpisode,
    onSettingsClick,
    autoSkipIntro,
    autoSkipOutro,
    controlsVisible,
    onPausedChange,
    trickplayUrl
}) => {
    // Hooks to access player state WITHOUT useRefs
    const currentTime = useMediaState('currentTime');
    const duration = useMediaState('duration');
    const isPaused = useMediaState('paused');
    const remote = useMediaRemote();
    const volume = useMediaState('volume');
    const isMuted = useMediaState('muted');

    // Notify parent of paused state changes for auto-hide logic
    useEffect(() => {
        if (onPausedChange) onPausedChange(isPaused);
    }, [isPaused, onPausedChange]);

    // --- Skip Intro Logic (Recreated using Vidstack State) ---
    const showSkipIntro = useMemo(() => {
        if (!chapters || chapters.length === 0) return null;

        // Find current chapter
        const currentChapterIndex = chapters.findIndex((c, i) => {
            const start = c.StartPositionTicks / 10000000;
            const nextChapter = chapters[i + 1];
            const end = nextChapter ? (nextChapter.StartPositionTicks / 10000000) : duration;
            return currentTime >= start && currentTime < end;
        });

        if (currentChapterIndex !== -1) {
            const currentChapter = chapters[currentChapterIndex];
            const name = currentChapter.Name.toLowerCase();

            // Check for Intro/OP/Avant
            if (name.includes('intro') || name.includes('opening') || name === 'op' || name === 'avant') {
                const nextChapter = chapters[currentChapterIndex + 1];
                if (nextChapter) {
                    return {
                        target: nextChapter.StartPositionTicks / 10000000,
                        type: 'intro'
                    };
                }
            }
        }
        return null;
    }, [currentTime, chapters, duration]);

    // --- Skip Outro Logic ---
    const showSkipOutro = useMemo(() => {
        if (!chapters || chapters.length === 0) return null;

        const currentChapterIndex = chapters.findIndex((c, i) => {
            const start = c.StartPositionTicks / 10000000;
            const nextChapter = chapters[i + 1];
            const end = nextChapter ? (nextChapter.StartPositionTicks / 10000000) : duration;
            return currentTime >= start && currentTime < end;
        });

        if (currentChapterIndex !== -1) {
            const currentChapter = chapters[currentChapterIndex];
            const name = currentChapter.Name.toLowerCase();

            if (name.includes('outro') || name.includes('ending') || name.includes('credits') || name === 'ed') {
                return {
                    type: 'outro'
                };
            }
        }
        return null;
    }, [currentTime, chapters, duration]);


    const handleSkip = () => {
        if (showSkipIntro) remote.seek(showSkipIntro.target);
    };

    const handleSkipCredits = () => {
        if (handleNextEpisode) {
            handleNextEpisode();
        }
    };

    // --- Auto Skip Effects ---
    useEffect(() => {
        if (autoSkipIntro && showSkipIntro) {
            console.log("[AutoSkip] Intro detected, seeking to:", showSkipIntro.target);
            remote.seek(showSkipIntro.target);
        }
    }, [autoSkipIntro, showSkipIntro, remote]);

    useEffect(() => {
        if (autoSkipOutro && showSkipOutro) {
            console.log("[AutoSkip] Outro detected, skipping...");
            handleSkipCredits();
        }
    }, [autoSkipOutro, showSkipOutro]); // handleSkipCredits is stable/depends on nextEpisodeId

    // --- Format Time Helper ---
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

    return (
        <div
            className={`lf-player-controls ${controlsVisible ? 'visible' : ''}`}
        >

            {/* 1. TOP BAR (Title & Back) */}
            <div className="lf-player-controls-top">
                <button className="icon-btn back-btn" onClick={() => navigate(`/series/${item.SeriesId}`)}>
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

            {/* 2. CENTER (Play Button Overlay) */}
            {isPaused && (
                <PlayButton className="center-play-btn">
                    <span className="material-icons">play_arrow</span>
                </PlayButton>
            )}

            {/* 4. BOTTOM BAR */}
            <div className="lf-player-controls-bottom">

                {/* Timeline - Vidstack TimeSlider */}
                <TimeSlider.Root className="media-slider">

                    {showSkipIntro && (
                        <button className="lf-skip-btn" style={{
                            position: 'absolute',
                            width: 'max-content',
                            bottom: `calc(100% + var(--media-slider-preview-offset, 0px))`
                        }}>
                            Skip Intro
                        </button>
                    )}

                    {showSkipOutro && !showSkipIntro && (
                        <button className="lf-skip-btn" style={{
                            position: 'absolute',
                            width: 'max-content',
                            bottom: `calc(100% + var(--media-slider-preview-offset, 0px))`
                        }}>
                            Next Episode
                        </button>
                    )}

                    <TimeSlider.Track className="media-slider-track">
                        <TimeSlider.TrackFill className="media-slider-track-fill media-slider-track" />
                        <TimeSlider.Progress className="media-slider-progress media-slider-track" />
                    </TimeSlider.Track>

                    <TimeSlider.Preview className="media-slider-preview" noClamp>
                        <TimeSlider.Thumbnail.Root src={trickplayUrl} className="media-slider-thumbnail">
                            <TimeSlider.Thumbnail.Img />
                        </TimeSlider.Thumbnail.Root>
                        <TimeSlider.Value className="media-slider-value" />
                    </TimeSlider.Preview>

                    <TimeSlider.Thumb className="media-slider-thumb" />
                </TimeSlider.Root>

                <Gesture className="vds-gesture" event="pointerup" action="toggle:paused" />
                <Gesture className="vds-gesture" event="dblpointerup" action="toggle:fullscreen" />
                <Gesture className="vds-gesture" event="dblpointerup" action="seek:-10" />
                <Gesture className="vds-gesture" event="dblpointerup" action="seek:10" />

                <div className="lf-player-controls-row">
                    <div className="controls-left">
                        {/* Play Toggle */}
                        <PlayButton className="icon-btn">
                            <span className="material-icons">
                                {isPaused ? 'play_arrow' : 'pause'}
                            </span>
                        </PlayButton>

                        <div className="seek-controls" style={{ display: 'flex', gap: '5px', margin: '0 10px' }}>
                            {/* Seek Backward */}
                            <SeekButton className="icon-btn" seconds={-10}>
                                <span className="material-icons">replay_10</span>
                            </SeekButton>

                            {/* Seek Forward */}
                            <SeekButton className="icon-btn" seconds={10}>
                                <span className="material-icons">forward_10</span>
                            </SeekButton>
                        </div>

                        {/* Next Episode */}
                        {nextEpisodeId && (
                            <button className="icon-btn" onClick={handleNextEpisode} title="Next Episode">
                                <span className="material-icons">skip_next</span>
                            </button>
                        )}

                        {/* Volume Control */}
                        <div className="volume-container">
                            <MuteButton className="icon-btn">
                                <VolumeIcon />
                            </MuteButton>
                            <div className="volume-slider-wrapper">
                                <VolumeSlider.Root className="media-slider">
                                    <VolumeSlider.Track className="media-slider-track">
                                        <VolumeSlider.TrackFill className="media-slider-track-fill media-slider-track" />
                                    </VolumeSlider.Track>
                                    <VolumeSlider.Thumb className="media-slider-thumb" />
                                </VolumeSlider.Root>
                            </div>
                        </div>

                        <span className="time-display">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>

                    <div className="controls-right">
                        {/* Settings Button */}
                        <button className="icon-btn" onClick={onSettingsClick} title="Settings">
                            <span className="material-icons">settings</span>
                        </button>

                        <FullscreenButton className="icon-btn">
                            <FullscreenIcon />
                        </FullscreenButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Component for Volume Icon
function VolumeIcon() {
    const volume = useMediaState('volume');
    const isMuted = useMediaState('muted');

    if (isMuted || volume === 0) return <span className="material-icons">volume_off</span>;
    if (volume < 0.5) return <span className="material-icons">volume_down</span>;
    return <span className="material-icons">volume_up</span>;
}

// Helper Component for Fullscreen Icon
function FullscreenIcon() {
    const isFullscreen = useMediaState('fullscreen');
    return <span className="material-icons">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>;
}

export default PlayerLayout;
