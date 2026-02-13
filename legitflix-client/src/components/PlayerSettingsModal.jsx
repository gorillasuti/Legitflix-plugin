import React, { useState } from 'react';
import PropTypes from 'prop-types';
import '../components/LegitFlixSettingsModal.css'; // Reuse existing styles
import { jellyfinService } from '../services/jellyfin';

const PlayerSettingsModal = ({
    isOpen,
    onClose,
    settingsTab,
    setSettingsTab,
    // Quality
    maxBitrate,
    setMaxBitrate,
    // Audio
    audioStreams,
    selectedAudioIndex,
    onSelectAudio,
    // Subtitles
    subtitleStreams,
    selectedSubtitleIndex,
    onSelectSubtitle,
    onOpenSubtitleSearch,
    onDeleteSubtitle,
    // Speed
    playbackRate,
    setPlaybackRate,
    // General
    autoPlay,
    setAutoPlay,
    autoSkipIntro,
    setAutoSkipIntro,
    autoSkipOutro,
    setAutoSkipOutro,
    // Theme Config Update (for persisting settings)
    updateConfig
}) => {
    if (!isOpen) return null;

    const renderQualityTab = () => (
        <div className="setting-section">
            <h3 className="setting-title">Quality</h3>
            <p className="setting-desc">Select maximum playback bitrate.</p>
            <div className="settings-list">
                <button className={`lf-btn ${!maxBitrate ? 'lf-btn--primary' : 'lf-btn--secondary'}`} onClick={() => setMaxBitrate(null)} style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}>
                    Auto
                    {!maxBitrate && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
                </button>
                <button className={`lf-btn ${maxBitrate === 120000000 ? 'lf-btn--primary' : 'lf-btn--secondary'}`} onClick={() => setMaxBitrate(120000000)} style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}>
                    4K (120Mbps)
                    {maxBitrate === 120000000 && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
                </button>
                <button className={`lf-btn ${maxBitrate === 60000000 ? 'lf-btn--primary' : 'lf-btn--secondary'}`} onClick={() => setMaxBitrate(60000000)} style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}>
                    1080p High (60Mbps)
                    {maxBitrate === 60000000 && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
                </button>
                <button className={`lf-btn ${maxBitrate === 20000000 ? 'lf-btn--primary' : 'lf-btn--secondary'}`} onClick={() => setMaxBitrate(20000000)} style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}>
                    1080p (20Mbps)
                    {maxBitrate === 20000000 && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
                </button>
                <button className={`lf-btn ${maxBitrate === 10000000 ? 'lf-btn--primary' : 'lf-btn--secondary'}`} onClick={() => setMaxBitrate(10000000)} style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}>
                    720p (10Mbps)
                    {maxBitrate === 10000000 && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
                </button>
            </div>
        </div>
    );

    const renderAudioTab = () => (
        <div className="setting-section">
            <h3 className="setting-title">Audio Streams</h3>
            <div className="settings-list">
                {audioStreams.length === 0 && <p className="setting-desc">No audio streams found.</p>}
                {audioStreams.map(stream => (
                    <button
                        key={stream.Index}
                        className={`lf-btn ${selectedAudioIndex === stream.Index ? 'lf-btn--primary' : 'lf-btn--secondary'}`}
                        onClick={() => onSelectAudio(stream.Index)}
                        style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}
                    >
                        {stream.Language || 'Unknown'} - {stream.Codec} {stream.Title ? `(${stream.Title})` : ''}
                        {selectedAudioIndex === stream.Index && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
                    </button>
                ))}
            </div>
        </div>
    );

    const renderSubtitlesTab = () => (
        <div className="setting-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="setting-title" style={{ margin: 0 }}>Subtitles</h3>
                <button className="lf-btn lf-btn--secondary" onClick={onOpenSubtitleSearch} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                    <span className="material-icons" style={{ fontSize: '16px', marginRight: '6px' }}>search</span>
                    Download
                </button>
            </div>

            <div className="settings-list">
                <button
                    className={`lf-btn ${selectedSubtitleIndex === null ? 'lf-btn--primary' : 'lf-btn--secondary'}`}
                    onClick={() => onSelectSubtitle(null)}
                    style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}
                >
                    Off
                </button>

                {subtitleStreams.map(stream => (
                    <div key={stream.Index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <button
                            className={`lf-btn ${selectedSubtitleIndex === stream.Index ? 'lf-btn--primary' : 'lf-btn--secondary'}`}
                            onClick={() => onSelectSubtitle(stream.Index)}
                            style={{ flex: 1, justifyContent: 'flex-start' }}
                        >
                            {stream.Language || 'Unknown'} {stream.Title ? `(${stream.Title})` : ''} {stream.IsForced ? '[Forced]' : ''} {stream.IsExternal ? '(Ext)' : ''}
                            {selectedSubtitleIndex === stream.Index && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
                        </button>

                        {stream.IsExternal && (
                            <button
                                className="lf-btn lf-btn--secondary"
                                onClick={(e) => { e.stopPropagation(); onDeleteSubtitle(stream.Index); }}
                                title="Delete Subtitle"
                                style={{ width: '40px', padding: 0, justifyContent: 'center' }}
                            >
                                <span className="material-icons" style={{ fontSize: '18px', color: '#ff4444' }}>delete_outline</span>
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderSpeedTab = () => (
        <div className="setting-section">
            <h3 className="setting-title">Playback Speed</h3>
            <div className="settings-list">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                    <button
                        key={rate}
                        className={`lf-btn ${playbackRate === rate ? 'lf-btn--primary' : 'lf-btn--secondary'}`}
                        onClick={() => setPlaybackRate(rate)}
                        style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}
                    >
                        {rate}x
                        {playbackRate === rate && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
                    </button>
                ))}
            </div>
        </div>
    );

    const renderGeneralTab = () => (
        <div className="setting-section">
            <h3 className="setting-title">General</h3>

            <div className="setting-row">
                <div>
                    <h4 className="setting-title" style={{ fontSize: '0.95rem' }}>Auto Play</h4>
                    <p className="setting-desc">Automatically play videos on load</p>
                </div>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={autoPlay}
                        onChange={(e) => setAutoPlay(e.target.checked)}
                    />
                    <span className="slider"></span>
                </label>
            </div>

            <div className="setting-row" style={{ marginTop: '16px' }}>
                <div>
                    <h4 className="setting-title" style={{ fontSize: '0.95rem' }}>Auto Skip Intro</h4>
                    <p className="setting-desc">Automatically skip intro sequences</p>
                </div>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={autoSkipIntro}
                        onChange={(e) => {
                            const val = e.target.checked;
                            setAutoSkipIntro(val);
                            if (updateConfig) updateConfig({ autoSkipIntro: val });
                        }}
                    />
                    <span className="slider"></span>
                </label>
            </div>

            <div className="setting-row" style={{ marginTop: '16px' }}>
                <div>
                    <h4 className="setting-title" style={{ fontSize: '0.95rem' }}>Auto Skip Outro</h4>
                    <p className="setting-desc">Automatically skip credits/outro</p>
                </div>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={autoSkipOutro}
                        onChange={(e) => {
                            const val = e.target.checked;
                            setAutoSkipOutro(val);
                            if (updateConfig) updateConfig({ autoSkipOutro: val });
                        }}
                    />
                    <span className="slider"></span>
                </label>
            </div>
        </div>
    );

    return (
        <div className="legit-settings-overlay" onClick={onClose}>
            <div className="legit-settings-modal" onClick={e => e.stopPropagation()} style={{ pointerEvents: 'auto', flexDirection: 'row', width: '800px', height: '500px', maxWidth: '95vw' }}>

                {/* Sidebar */}
                <div className="legit-settings-sidebar">
                    <div className="sidebar-header">
                        <h2>Settings</h2>
                    </div>
                    <div className="sidebar-tabs">
                        <button className={`sidebar-tab ${settingsTab === 'Quality' ? 'active' : ''}`} onClick={() => setSettingsTab('Quality')}>
                            <span className="material-icons">hd</span> Quality
                        </button>
                        <button className={`sidebar-tab ${settingsTab === 'Audio' ? 'active' : ''}`} onClick={() => setSettingsTab('Audio')}>
                            <span className="material-icons">audiotrack</span> Audio
                        </button>
                        <button className={`sidebar-tab ${settingsTab === 'Subtitles' ? 'active' : ''}`} onClick={() => setSettingsTab('Subtitles')}>
                            <span className="material-icons">subtitles</span> Subtitles
                        </button>
                        <button className={`sidebar-tab ${settingsTab === 'Speed' ? 'active' : ''}`} onClick={() => setSettingsTab('Speed')}>
                            <span className="material-icons">speed</span> Speed
                        </button>
                        <button className={`sidebar-tab ${settingsTab === 'General' ? 'active' : ''}`} onClick={() => setSettingsTab('General')}>
                            <span className="material-icons">room_service</span> General
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="legit-settings-content">
                    <div className="content-header-player">
                        <h2>{settingsTab}</h2>
                        <button className="close-btn-icon" onClick={onClose}>
                            <span className="material-icons">close</span>
                        </button>
                    </div>
                    <div className="content-body">
                        {settingsTab === 'Quality' && renderQualityTab()}
                        {settingsTab === 'Audio' && renderAudioTab()}
                        {settingsTab === 'Subtitles' && renderSubtitlesTab()}
                        {settingsTab === 'Speed' && renderSpeedTab()}
                        {settingsTab === 'General' && renderGeneralTab()}
                    </div>
                    <div className="content-footer">
                        <button
                            className="btn-reset"
                            onClick={() => {
                                // Restore all settings to defaults
                                setMaxBitrate(null);
                                setPlaybackRate(1);
                                setAutoPlay(true);
                                if (setAutoSkipIntro) setAutoSkipIntro(true);
                                if (setAutoSkipOutro) setAutoSkipOutro(true);

                                // Clear persisted values
                                const keys = ['maxBitrate', 'playbackRate', 'autoPlay', 'autoSkipIntro', 'autoSkipOutro'];
                                keys.forEach(k => localStorage.removeItem(`legitflix_${k}`));

                                // Also update theme config if available
                                if (updateConfig) updateConfig({ autoSkipIntro: true, autoSkipOutro: true });

                                onClose();
                            }}
                        >
                            Restore Defaults
                        </button>
                        <button
                            className="btn-save lf-btn--ring-hover"
                            onClick={() => {
                                // Persist all current settings to localStorage
                                localStorage.setItem('legitflix_maxBitrate', JSON.stringify(maxBitrate));
                                localStorage.setItem('legitflix_playbackRate', JSON.stringify(playbackRate));
                                localStorage.setItem('legitflix_autoPlay', JSON.stringify(autoPlay));
                                localStorage.setItem('legitflix_autoSkipIntro', JSON.stringify(autoSkipIntro));
                                localStorage.setItem('legitflix_autoSkipOutro', JSON.stringify(autoSkipOutro));

                                // Also update theme config if available
                                if (updateConfig) updateConfig({ autoSkipIntro, autoSkipOutro });

                                onClose();
                            }}
                        >
                            Save Settings
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

PlayerSettingsModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    settingsTab: PropTypes.string.isRequired,
    setSettingsTab: PropTypes.func.isRequired,
    maxBitrate: PropTypes.number,
    setMaxBitrate: PropTypes.func.isRequired,
    audioStreams: PropTypes.array.isRequired,
    selectedAudioIndex: PropTypes.number,
    onSelectAudio: PropTypes.func.isRequired,
    subtitleStreams: PropTypes.array.isRequired,
    selectedSubtitleIndex: PropTypes.number,
    onSelectSubtitle: PropTypes.func.isRequired,
    onOpenSubtitleSearch: PropTypes.func.isRequired,
    onDeleteSubtitle: PropTypes.func.isRequired,
    playbackRate: PropTypes.number.isRequired,
    setPlaybackRate: PropTypes.func.isRequired,
    autoPlay: PropTypes.bool.isRequired,
    setAutoPlay: PropTypes.func.isRequired,
    autoSkipIntro: PropTypes.bool,
    setAutoSkipIntro: PropTypes.func,
    autoSkipOutro: PropTypes.bool,
    setAutoSkipOutro: PropTypes.func,
    updateConfig: PropTypes.func
};

export default PlayerSettingsModal;
