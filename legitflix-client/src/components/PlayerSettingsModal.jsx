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
    // Local State for Confirmation Logic
    const [localMaxBitrate, setLocalMaxBitrate] = useState(maxBitrate);
    const [localSelectedAudioIndex, setLocalSelectedAudioIndex] = useState(selectedAudioIndex);
    const [localSelectedSubtitleIndex, setLocalSelectedSubtitleIndex] = useState(selectedSubtitleIndex);
    const [localPlaybackRate, setLocalPlaybackRate] = useState(playbackRate);
    const [localAutoPlay, setLocalAutoPlay] = useState(autoPlay);
    const [localAutoSkipIntro, setLocalAutoSkipIntro] = useState(autoSkipIntro);
    const [localAutoSkipOutro, setLocalAutoSkipOutro] = useState(autoSkipOutro);

    // Sync local state with props when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setLocalMaxBitrate(maxBitrate);
            setLocalSelectedAudioIndex(selectedAudioIndex);
            setLocalSelectedSubtitleIndex(selectedSubtitleIndex);
            setLocalPlaybackRate(playbackRate);
            setLocalAutoPlay(autoPlay);
            setLocalAutoSkipIntro(autoSkipIntro);
            setLocalAutoSkipOutro(autoSkipOutro);
        }
    }, [isOpen, maxBitrate, selectedAudioIndex, selectedSubtitleIndex, playbackRate, autoPlay, autoSkipIntro, autoSkipOutro]);

    if (!isOpen) return null;

    const renderQualityTab = () => (
        <div className="setting-section">
            <h3 className="setting-title">Quality</h3>
            <p className="setting-desc">Select maximum playback bitrate.</p>
            <div className="settings-list">
                <button className={`lf-btn ${!localMaxBitrate ? 'lf-btn--primary' : 'lf-btn--secondary'}`} onClick={() => setLocalMaxBitrate(null)} style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}>
                    Auto
                    {!localMaxBitrate && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
                </button>
                <button className={`lf-btn ${localMaxBitrate === 120000000 ? 'lf-btn--primary' : 'lf-btn--secondary'}`} onClick={() => setLocalMaxBitrate(120000000)} style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}>
                    4K (120Mbps)
                    {localMaxBitrate === 120000000 && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
                </button>
                <button className={`lf-btn ${localMaxBitrate === 60000000 ? 'lf-btn--primary' : 'lf-btn--secondary'}`} onClick={() => setLocalMaxBitrate(60000000)} style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}>
                    1080p High (60Mbps)
                    {localMaxBitrate === 60000000 && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
                </button>
                <button className={`lf-btn ${localMaxBitrate === 20000000 ? 'lf-btn--primary' : 'lf-btn--secondary'}`} onClick={() => setLocalMaxBitrate(20000000)} style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}>
                    1080p (20Mbps)
                    {localMaxBitrate === 20000000 && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
                </button>
                <button className={`lf-btn ${localMaxBitrate === 10000000 ? 'lf-btn--primary' : 'lf-btn--secondary'}`} onClick={() => setLocalMaxBitrate(10000000)} style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}>
                    720p (10Mbps)
                    {localMaxBitrate === 10000000 && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
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
                        className={`lf-btn ${localSelectedAudioIndex === stream.Index ? 'lf-btn--primary' : 'lf-btn--secondary'}`}
                        onClick={() => setLocalSelectedAudioIndex(stream.Index)}
                        style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}
                    >
                        {stream.Language || 'Unknown'} - {stream.Codec} {stream.Title ? `(${stream.Title})` : ''}
                        {localSelectedAudioIndex === stream.Index && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
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
                    className={`lf-btn ${localSelectedSubtitleIndex === null ? 'lf-btn--primary' : 'lf-btn--secondary'}`}
                    onClick={() => setLocalSelectedSubtitleIndex(null)}
                    style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}
                >
                    Off
                </button>

                {subtitleStreams.map(stream => (
                    <div key={stream.Index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <button
                            className={`lf-btn ${localSelectedSubtitleIndex === stream.Index ? 'lf-btn--primary' : 'lf-btn--secondary'}`}
                            onClick={() => setLocalSelectedSubtitleIndex(stream.Index)}
                            style={{ flex: 1, justifyContent: 'flex-start' }}
                        >
                            {stream.Language || 'Unknown'} {stream.Title ? `(${stream.Title})` : ''} {stream.IsForced ? '[Forced]' : ''} {stream.IsExternal ? '(Ext)' : ''}
                            {localSelectedSubtitleIndex === stream.Index && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
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
                        className={`lf-btn ${localPlaybackRate === rate ? 'lf-btn--primary' : 'lf-btn--secondary'}`}
                        onClick={() => setLocalPlaybackRate(rate)}
                        style={{ width: '100%', marginBottom: '8px', justifyContent: 'flex-start' }}
                    >
                        {rate}x
                        {localPlaybackRate === rate && <span className="material-icons" style={{ marginLeft: 'auto', fontSize: '18px' }}>check</span>}
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
                        checked={localAutoPlay}
                        onChange={(e) => setLocalAutoPlay(e.target.checked)}
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
                        checked={localAutoSkipIntro}
                        onChange={(e) => setLocalAutoSkipIntro(e.target.checked)}
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
                        checked={localAutoSkipOutro}
                        onChange={(e) => setLocalAutoSkipOutro(e.target.checked)}
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
                    <div className="content-header">
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
                                // Reset Local State to Defaults
                                setLocalMaxBitrate(null);
                                setLocalPlaybackRate(1);
                                setLocalAutoPlay(true);
                                setLocalAutoSkipIntro(true);
                                setLocalAutoSkipOutro(true);
                                // Note: We do NOT close or save yet. The user must click Save.
                            }}
                        >
                            Restore Defaults
                        </button>
                        <button
                            className="btn-save lf-btn--ring-hover"
                            onClick={() => {
                                // 1. Apply Settings via Parent Setters
                                if (localMaxBitrate !== maxBitrate) setMaxBitrate(localMaxBitrate);
                                if (localPlaybackRate !== playbackRate) setPlaybackRate(localPlaybackRate);
                                if (localAutoPlay !== autoPlay) setAutoPlay(localAutoPlay);
                                if (localAutoSkipIntro !== autoSkipIntro) setAutoSkipIntro(localAutoSkipIntro);
                                if (localAutoSkipOutro !== autoSkipOutro) setAutoSkipOutro(localAutoSkipOutro);

                                // 2. Handle Stream Switching (Audio/Sub/Quality)
                                // Only call these if changed, to avoid unnecessary reloads
                                if (localSelectedAudioIndex !== selectedAudioIndex) onSelectAudio(localSelectedAudioIndex);
                                if (localSelectedSubtitleIndex !== selectedSubtitleIndex) onSelectSubtitle(localSelectedSubtitleIndex);

                                // 3. Persist to Server/LocalStorage
                                const configUpdates = {
                                    audioIndex: localSelectedAudioIndex,
                                    subtitleIndex: localSelectedSubtitleIndex
                                };
                                if (localAutoSkipIntro !== autoSkipIntro) configUpdates.autoSkipIntro = localAutoSkipIntro;
                                if (localAutoSkipOutro !== autoSkipOutro) configUpdates.autoSkipOutro = localAutoSkipOutro;
                                if (updateConfig) updateConfig(configUpdates);

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
