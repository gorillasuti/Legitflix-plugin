import React, { useState, useEffect } from 'react';
import './PlayerSettingsModal.css';

const PlayerSettingsModal = ({
    isOpen,
    onClose,
    mediaSources,
    currentAudioStreamIndex,
    currentSubtitleStreamIndex,
    currentQuality,
    currentPlaybackSpeed,
    onAudioChange,
    onSubtitleChange,
    onQualityChange,
    onSpeedChange,
    onOpenSubtitleDownload
}) => {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('quality');

    // Helper to get generic name if title is missing
    const getStreamName = (stream, type, index) => {
        return stream.Title || stream.DisplayTitle || `${type} ${index + 1} (${stream.Language || 'Unknown'})`;
    };

    const qualities = [
        { label: 'Auto', bitrate: null },
        { label: '1080p - 10 Mbps', bitrate: 10000000 },
        { label: '1080p - 8 Mbps', bitrate: 8000000 },
        { label: '720p - 4 Mbps', bitrate: 4000000 },
        { label: '480p - 1.5 Mbps', bitrate: 1500000 },
        { label: '360p - 0.7 Mbps', bitrate: 700000 }, // added 360p mostly for mobile testing/low bandwidth
    ];

    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

    const audioStreams = mediaSources?.[0]?.MediaStreams?.filter(s => s.Type === 'Audio') || [];
    const subtitleStreams = mediaSources?.[0]?.MediaStreams?.filter(s => s.Type === 'Subtitle') || [];

    // Add "Off" option for subtitles
    const subtitleOptions = [{ Index: -1, Title: 'Off' }, ...subtitleStreams];

    return (
        <div className="lf-player-settings-overlay" onClick={onClose}>
            <div className="lf-player-settings-modal" onClick={e => e.stopPropagation()}>
                <div className="lf-settings-header">
                    <h3>Settings</h3>
                    <button className="lf-close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="lf-settings-tabs">
                    <button
                        className={activeTab === 'quality' ? 'active' : ''}
                        onClick={() => setActiveTab('quality')}
                    >
                        Quality
                    </button>
                    <button
                        className={activeTab === 'audio' ? 'active' : ''}
                        onClick={() => setActiveTab('audio')}
                    >
                        Audio
                    </button>
                    <button
                        className={activeTab === 'subtitles' ? 'active' : ''}
                        onClick={() => setActiveTab('subtitles')}
                    >
                        Subtitles
                    </button>
                    <button
                        className={activeTab === 'speed' ? 'active' : ''}
                        onClick={() => setActiveTab('speed')}
                    >
                        Speed
                    </button>
                </div>

                <div className="lf-settings-content">
                    {activeTab === 'quality' && (
                        <div className="lf-options-list">
                            {qualities.map((q) => (
                                <button
                                    key={q.label}
                                    className={currentQuality === q.bitrate ? 'selected' : ''}
                                    onClick={() => onQualityChange(q.bitrate)}
                                >
                                    {q.label}
                                    {currentQuality === q.bitrate && <span className="lf-check">✓</span>}
                                </button>
                            ))}
                        </div>
                    )}

                    {activeTab === 'audio' && (
                        <div className="lf-options-list">
                            {audioStreams.map((stream) => (
                                <button
                                    key={stream.Index}
                                    className={currentAudioStreamIndex === stream.Index ? 'selected' : ''}
                                    onClick={() => onAudioChange(stream.Index)}
                                >
                                    {getStreamName(stream, 'Audio', stream.Index)}
                                    {currentAudioStreamIndex === stream.Index && <span className="lf-check">✓</span>}
                                </button>
                            ))}
                            {audioStreams.length === 0 && <p className="lf-no-options">No audio streams available</p>}
                        </div>
                    )}

                    {activeTab === 'subtitles' && (
                        <div className="lf-options-list">
                            {subtitleOptions.map((stream) => (
                                <button
                                    key={stream.Index}
                                    className={(currentSubtitleStreamIndex === stream.Index) || (stream.Index === -1 && currentSubtitleStreamIndex == null) ? 'selected' : ''}
                                    onClick={() => onSubtitleChange(stream.Index === -1 ? null : stream.Index)}
                                >
                                    {stream.Index === -1 ? 'Off' : getStreamName(stream, 'Subtitle', stream.Index)}
                                    {((currentSubtitleStreamIndex === stream.Index) || (stream.Index === -1 && currentSubtitleStreamIndex == null)) && <span className="lf-check">✓</span>}
                                </button>
                            ))}
                            <button className="lf-action-btn" onClick={onOpenSubtitleDownload}>
                                Find usage...
                            </button>
                        </div>
                    )}

                    {activeTab === 'speed' && (
                        <div className="lf-options-list">
                            {speeds.map((s) => (
                                <button
                                    key={s}
                                    className={currentPlaybackSpeed === s ? 'selected' : ''}
                                    onClick={() => onSpeedChange(s)}
                                >
                                    {s}x
                                    {currentPlaybackSpeed === s && <span className="lf-check">✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayerSettingsModal;
