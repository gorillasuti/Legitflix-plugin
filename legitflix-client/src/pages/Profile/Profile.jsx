
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import Navbar from '../../components/Navbar';
import BannerPickerModal from '../../components/BannerPickerModal';
import AvatarPickerModal from '../../components/AvatarPickerModal';
import LegitFlixSettingsModal from '../../components/LegitFlixSettingsModal';
import SkeletonLoader from '../../components/SkeletonLoader';
import './Profile.css';

const TABS = [
    { id: 'details', label: 'My details' },
    { id: 'display', label: 'Display' },
    { id: 'home', label: 'Home Screen' },
    { id: 'playback', label: 'Playback' },
    { id: 'subtitles', label: 'Subtitles' },
    { id: 'quickconnect', label: 'Quick Connect' },
    { id: 'advanced', label: 'Advanced' },
];

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('details');
    const [bannerUrl, setBannerUrl] = useState('');
    const [showBannerPicker, setShowBannerPicker] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [showLegitSettings, setShowLegitSettings] = useState(false);

    // Password state
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwMsg, setPwMsg] = useState(null);
    const [pwLoading, setPwLoading] = useState(false);

    // Display settings
    const [displayLang, setDisplayLang] = useState('en-US');
    const [dateFormat, setDateFormat] = useState('default');

    // Playback settings
    const [audioLang, setAudioLang] = useState('');
    const [maxBitrate, setMaxBitrate] = useState('');
    const [subtitleMode, setSubtitleMode] = useState('Default');

    // Subtitle settings
    const [subLang, setSubLang] = useState('');
    const [subMode, setSubMode] = useState('Default');

    // Quick Connect
    const [qcCode, setQcCode] = useState('');
    const [qcMsg, setQcMsg] = useState(null);

    // Home Screen sections
    const [homeSections, setHomeSections] = useState([
        { id: 'resume', label: 'Continue Watching', enabled: true },
        { id: 'latestMedia', label: 'Latest Media', enabled: true },
        { id: 'nextUp', label: 'Next Up', enabled: true },
        { id: 'favorites', label: 'My Favorites', enabled: true },
    ]);

    useEffect(() => {
        const loadUser = async () => {
            const u = await jellyfinService.getCurrentUser();
            if (u) {
                setUser(u);

                // Load user configuration into state
                const cfg = u.Configuration || {};
                if (cfg.AudioLanguagePreference) setAudioLang(cfg.AudioLanguagePreference);
                if (cfg.SubtitleLanguagePreference) setSubLang(cfg.SubtitleLanguagePreference);
                if (cfg.SubtitleMode) setSubMode(cfg.SubtitleMode);

                // Banner Logic
                const localBanner = localStorage.getItem(`LegitFlix_Banner_${u.Id}`);
                if (localBanner) {
                    setBannerUrl(localBanner);
                } else if (u.ImageTags && u.ImageTags.Banner) {
                    setBannerUrl(`${jellyfinService.api.basePath}/Users/${u.Id}/Images/Banner?tag=${u.ImageTags.Banner}&quality=90`);
                } else if (u.BackdropImageTags && u.BackdropImageTags.length > 0) {
                    setBannerUrl(`${jellyfinService.api.basePath}/Users/${u.Id}/Images/Backdrop/0?tag=${u.BackdropImageTags[0]}&quality=90`);
                }
            }
        };
        loadUser();
    }, []);

    // --- Handlers ---

    const handleBannerSave = (url) => {
        if (user) {
            localStorage.setItem(`LegitFlix_Banner_${user.Id}`, url);
            setBannerUrl(url);
        }
    };

    const handleAvatarSave = async (file) => {
        if (!file || !user) return;
        try {
            await jellyfinService.uploadUserImage(user.Id, 'Primary', file);

            // Force update avatar
            setUser(prev => ({ ...prev, PrimaryImageTag: Date.now().toString() })); // Hack to refresh image

            // Ideally reload user to get new Tag
            const u = await jellyfinService.getCurrentUser();
            if (u) setUser(u);

            setShowAvatarPicker(false);
        } catch (e) {
            console.error("Failed to upload avatar", e);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPwMsg(null);
        if (newPw !== confirmPw) {
            setPwMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (!newPw) {
            setPwMsg({ type: 'error', text: 'New password cannot be empty.' });
            return;
        }
        setPwLoading(true);
        try {
            await jellyfinService.updatePassword(user.Id, currentPw, newPw);
            setPwMsg({ type: 'success', text: 'Password updated successfully!' });
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
        } catch (err) {
            setPwMsg({ type: 'error', text: err.message || 'Failed to update password.' });
        } finally {
            setPwLoading(false);
        }
    };

    const handleQuickConnect = async () => {
        setQcMsg(null);
        if (!qcCode.trim()) {
            setQcMsg({ type: 'error', text: 'Please enter a code.' });
            return;
        }
        try {
            await jellyfinService.quickConnect(qcCode.trim());
            setQcMsg({ type: 'success', text: 'Device authorized successfully!' });
            setQcCode('');
        } catch (err) {
            setQcMsg({ type: 'error', text: err.message || 'Authorization failed.' });
        }
    };

    const toggleHomeSection = (id) => {
        setHomeSections(prev =>
            prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
        );
    };

    const handleLogout = async () => {
        await jellyfinService.logout();
    };

    if (!user) {
        return (
            <div className="profile-page">
                <Navbar />
                <div className="settings-container">
                    <SkeletonLoader type="text" width="200px" height="32px" style={{ marginBottom: '20px' }} />
                    <div className="settings-tabs">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <SkeletonLoader key={i} width="100px" height="40px" style={{ display: 'inline-block', marginRight: '8px', borderRadius: '20px' }} />
                        ))}
                    </div>
                    <SkeletonLoader width="100%" height="250px" style={{ margin: '20px 0', borderRadius: '12px' }} />
                    <div style={{ display: 'flex', gap: '20px', marginTop: '-55px', paddingLeft: '30px', position: 'relative', marginBottom: '28px' }}>
                        <SkeletonLoader type="circle" width="110px" height="110px" style={{ border: '4px solid #0e0e0e' }} />
                    </div>

                    {/* Content Card Skeleton */}
                    <div className="settings-card" style={{ padding: '28px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '14px' }}>
                        <SkeletonLoader width="180px" height="24px" style={{ marginBottom: '24px' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '18px' }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i}>
                                    <SkeletonLoader width="80px" height="14px" style={{ marginBottom: '8px' }} />
                                    <SkeletonLoader width="140px" height="20px" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const avatarUrl = user.PrimaryImageTag
        ? `${jellyfinService.api.basePath}/Users/${user.Id}/Images/Primary?tag=${user.PrimaryImageTag}&quality=90`
        : null;

    // --- TAB RENDERERS ---

    const renderMyDetails = () => (
        <>
            <div className="settings-card">
                <h3 className="settings-card-title">User Information</h3>
                <div className="info-grid">
                    <div className="info-item">
                        <label>Username</label>
                        <div className="info-value">{user.Name}</div>
                    </div>
                    <div className="info-item">
                        <label>Last Login</label>
                        <div className="info-value">
                            {user.LastLoginDate ? new Date(user.LastLoginDate).toLocaleDateString() : '—'}
                        </div>
                    </div>
                    <div className="info-item">
                        <label>Administrator</label>
                        <div className="info-value">{user.Policy?.IsAdministrator ? 'Yes' : 'No'}</div>
                    </div>
                    <div className="info-item">
                        <label>User ID</label>
                        <div className="info-value info-value-small">{user.Id}</div>
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <h3 className="settings-card-title">Change Password</h3>
                <form className="password-form" onSubmit={handlePasswordSubmit}>
                    <div className="form-group">
                        <label>Current Password</label>
                        <input
                            type="password"
                            value={currentPw}
                            onChange={e => setCurrentPw(e.target.value)}
                            className="settings-input"
                            autoComplete="current-password"
                        />
                    </div>
                    <div className="form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={newPw}
                            onChange={e => setNewPw(e.target.value)}
                            className="settings-input"
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPw}
                            onChange={e => setConfirmPw(e.target.value)}
                            className="settings-input"
                            autoComplete="new-password"
                        />
                    </div>
                    {pwMsg && (
                        <div className={`form-message ${pwMsg.type}`}>
                            <span className="material-icons">
                                {pwMsg.type === 'success' ? 'check_circle' : 'error'}
                            </span>
                            {pwMsg.text}
                        </div>
                    )}
                    <button type="submit" className="btn-accent" disabled={pwLoading}>
                        {pwLoading ? 'SAVING...' : 'SAVE PASSWORD'}
                    </button>
                </form>
            </div>
        </>
    );

    const renderDisplay = () => (
        <div className="settings-card">
            <h3 className="settings-card-title">Display Preferences</h3>
            <div className="form-group">
                <label>Display Language</label>
                <select
                    className="settings-select"
                    value={displayLang}
                    onChange={e => setDisplayLang(e.target.value)}
                >
                    <option value="en-US">English (United States)</option>
                    <option value="hu">Magyar (Hungarian)</option>
                    <option value="de">Deutsch (German)</option>
                    <option value="fr">Français (French)</option>
                    <option value="es">Español (Spanish)</option>
                    <option value="ja">日本語 (Japanese)</option>
                </select>
            </div>
            <div className="form-group">
                <label>Date Format</label>
                <select
                    className="settings-select"
                    value={dateFormat}
                    onChange={e => setDateFormat(e.target.value)}
                >
                    <option value="default">Use browser default</option>
                    <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                    <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                    <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                </select>
            </div>
            <div className="setting-row">
                <div className="setting-row-label">
                    <span>Enable LegitFlix Theme</span>
                    <span className="setting-hint">Use the custom gaming profile theme</span>
                </div>
                <label className="toggle-switch">
                    <input type="checkbox" defaultChecked={true} />
                    <span className="slider"></span>
                </label>
            </div>
        </div>
    );

    const renderHomeScreen = () => (
        <div className="settings-card">
            <h3 className="settings-card-title">Home Screen Sections</h3>
            <p className="settings-description">Choose which sections to display on your home screen.</p>
            {homeSections.map(section => (
                <div className="setting-row" key={section.id}>
                    <div className="setting-row-label">
                        <span>{section.label}</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={section.enabled}
                            onChange={() => toggleHomeSection(section.id)}
                        />
                        <span className="slider"></span>
                    </label>
                </div>
            ))}
        </div>
    );

    const renderPlayback = () => (
        <div className="settings-card">
            <h3 className="settings-card-title">Playback Settings</h3>
            <div className="form-group">
                <label>Preferred Audio Language</label>
                <select
                    className="settings-select"
                    value={audioLang}
                    onChange={e => setAudioLang(e.target.value)}
                >
                    <option value="">Auto / Server Default</option>
                    <option value="eng">English</option>
                    <option value="hun">Hungarian</option>
                    <option value="jpn">Japanese</option>
                    <option value="ger">German</option>
                    <option value="fre">French</option>
                    <option value="spa">Spanish</option>
                </select>
            </div>
            <div className="form-group">
                <label>Max Streaming Bitrate</label>
                <select
                    className="settings-select"
                    value={maxBitrate}
                    onChange={e => setMaxBitrate(e.target.value)}
                >
                    <option value="">Auto</option>
                    <option value="120000000">120 Mbps (4K)</option>
                    <option value="80000000">80 Mbps</option>
                    <option value="60000000">60 Mbps</option>
                    <option value="40000000">40 Mbps</option>
                    <option value="20000000">20 Mbps (1080p)</option>
                    <option value="8000000">8 Mbps (720p)</option>
                    <option value="4000000">4 Mbps</option>
                    <option value="2000000">2 Mbps</option>
                </select>
            </div>
            <div className="setting-row">
                <div className="setting-row-label">
                    <span>Prefer fMP4-HLS Container</span>
                    <span className="setting-hint">Uses fMP4 container for HLS playback when available</span>
                </div>
                <label className="toggle-switch">
                    <input type="checkbox" defaultChecked={false} />
                    <span className="slider"></span>
                </label>
            </div>
            <div className="setting-row">
                <div className="setting-row-label">
                    <span>Enable Cinema Mode</span>
                    <span className="setting-hint">Play trailers and custom intros before the main feature</span>
                </div>
                <label className="toggle-switch">
                    <input type="checkbox" defaultChecked={true} />
                    <span className="slider"></span>
                </label>
            </div>
        </div>
    );

    const renderSubtitles = () => (
        <div className="settings-card">
            <h3 className="settings-card-title">Subtitle Preferences</h3>
            <div className="form-group">
                <label>Preferred Subtitle Language</label>
                <select
                    className="settings-select"
                    value={subLang}
                    onChange={e => setSubLang(e.target.value)}
                >
                    <option value="">None</option>
                    <option value="eng">English</option>
                    <option value="hun">Hungarian</option>
                    <option value="jpn">Japanese</option>
                    <option value="ger">German</option>
                    <option value="fre">French</option>
                    <option value="spa">Spanish</option>
                </select>
            </div>
            <div className="form-group">
                <label>Subtitle Mode</label>
                <select
                    className="settings-select"
                    value={subMode}
                    onChange={e => setSubMode(e.target.value)}
                >
                    <option value="Default">Default</option>
                    <option value="Always">Always Show</option>
                    <option value="OnlyForced">Only Forced</option>
                    <option value="None">None</option>
                    <option value="Smart">Smart (match audio)</option>
                </select>
            </div>
            <div className="setting-row">
                <div className="setting-row-label">
                    <span>Burn in Subtitles</span>
                    <span className="setting-hint">Permanently render subtitles into the video stream</span>
                </div>
                <label className="toggle-switch">
                    <input type="checkbox" defaultChecked={false} />
                    <span className="slider"></span>
                </label>
            </div>
        </div>
    );

    const renderQuickConnect = () => (
        <div className="settings-card">
            <h3 className="settings-card-title">Quick Connect</h3>
            <p className="settings-description">
                Enter the code displayed on your device to authorize it with your account.
            </p>
            <div className="qc-row">
                <input
                    type="text"
                    className="settings-input qc-input"
                    placeholder="Enter code"
                    value={qcCode}
                    onChange={e => setQcCode(e.target.value)}
                    maxLength={10}
                />
                <button className="btn-accent" onClick={handleQuickConnect}>
                    AUTHORIZE
                </button>
            </div>
            {qcMsg && (
                <div className={`form-message ${qcMsg.type}`} style={{ marginTop: '12px' }}>
                    <span className="material-icons">
                        {qcMsg.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    {qcMsg.text}
                </div>
            )}
        </div>
    );

    const renderAdvanced = () => (
        <div className="settings-card">
            <h3 className="settings-card-title">Advanced</h3>
            {user.Policy?.IsAdministrator && (
                <button
                    className="btn-link-row"
                    onClick={() => window.location.href = '/web/index.html#!/dashboard'}
                >
                    <span className="material-icons">dashboard</span>
                    <div>
                        <span>Server Dashboard</span>
                        <span className="setting-hint">Manage server settings, users, and libraries</span>
                    </div>
                    <span className="material-icons link-arrow">chevron_right</span>
                </button>
            )}
            <button
                className="btn-link-row"
                onClick={() => window.location.href = '/web/index.html#!/playback/profile'}
            >
                <span className="material-icons">tune</span>
                <div>
                    <span>Playback Profiles</span>
                    <span className="setting-hint">Configure device playback profiles</span>
                </div>
                <span className="material-icons link-arrow">chevron_right</span>
            </button>
            <button
                className="btn-link-row"
                onClick={() => window.location.href = '/web/index.html#!/networking'}
            >
                <span className="material-icons">lan</span>
                <div>
                    <span>Networking</span>
                    <span className="setting-hint">Server networking and remote access settings</span>
                </div>
                <span className="material-icons link-arrow">chevron_right</span>
            </button>
            <button
                className="btn-link-row"
                onClick={() => window.location.href = '/web/index.html#!/mypreferencesmenu'}
            >
                <span className="material-icons">settings_applications</span>
                <div>
                    <span>Classic User Settings</span>
                    <span className="setting-hint">Open the default Jellyfin user preferences</span>
                </div>
                <span className="material-icons link-arrow">chevron_right</span>
            </button>
            {user.Policy?.IsAdministrator && (
                <button
                    className="btn-link-row"
                    onClick={() => window.location.href = '/web/index.html#!/plugins'}
                >
                    <span className="material-icons">extension</span>
                    <div>
                        <span>Plugins</span>
                        <span className="setting-hint">Manage installed plugins</span>
                    </div>
                    <span className="material-icons link-arrow">chevron_right</span>
                </button>
            )}
            <div className="dropdown-divider" style={{ margin: '16px 0', borderColor: 'rgba(255,255,255,0.05)' }}></div>
            <button
                className="btn-link-row"
                onClick={() => setShowLegitSettings(true)}
            >
                <span className="material-icons">palette</span>
                <div>
                    <span>LegitFlix Settings</span>
                    <span className="setting-hint">Customize theme colors and logo</span>
                </div>
                <span className="material-icons link-arrow">chevron_right</span>
            </button>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'details': return renderMyDetails();
            case 'display': return renderDisplay();
            case 'home': return renderHomeScreen();
            case 'playback': return renderPlayback();
            case 'subtitles': return renderSubtitles();
            case 'quickconnect': return renderQuickConnect();
            case 'advanced': return renderAdvanced();
            default: return null;
        }
    };

    return (
        <div className="profile-page">
            <Navbar />

            <div className="settings-container">
                <h1 className="settings-page-title">Account Settings</h1>

                {/* TABS */}
                <div className="settings-tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}

                    {/* Logout */}
                    <button className="settings-tab settings-tab-logout" onClick={handleLogout} title="Sign Out">
                        <span className="material-icons">exit_to_app</span>
                    </button>
                </div>

                {/* BANNER */}
                <div
                    className={`settings-banner ${bannerUrl ? 'has-banner' : ''}`}
                    style={bannerUrl ? { backgroundImage: `url('${bannerUrl}')` } : {}}
                >
                    <div className="banner-overlay"></div>
                    <div className="banner-edit-btn" onClick={() => setShowBannerPicker(true)}>
                        <span className="material-icons-outlined">
                            {bannerUrl ? 'edit' : 'add_photo_alternate'}
                        </span>
                        <span>{bannerUrl ? 'Change profile banner' : 'Add profile banner'}</span>
                    </div>
                </div>

                {/* AVATAR */}
                <div className="settings-avatar-wrap">
                    <div
                        className="settings-avatar"
                        style={avatarUrl ? { backgroundImage: `url('${avatarUrl}')` } : {}}
                    >
                        {!avatarUrl && <span className="material-icons avatar-placeholder">person</span>}
                    </div>
                    <div className="avatar-edit-badge" title="Change avatar" onClick={() => setShowAvatarPicker(true)}>
                        <span className="material-icons">edit</span>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="settings-content">
                    {renderContent()}
                </div>
            </div>

            <BannerPickerModal
                isOpen={showBannerPicker}
                onClose={() => setShowBannerPicker(false)}
                onSave={handleBannerSave}
                userId={user?.Id}
            />

            <LegitFlixSettingsModal
                isOpen={showLegitSettings}
                onClose={() => setShowLegitSettings(false)}
                userId={user?.Id}
            />

            <AvatarPickerModal
                isOpen={showAvatarPicker}
                onClose={() => setShowAvatarPicker(false)}
                onSave={handleAvatarSave}
                userId={user?.Id}
            />
        </div>
    );
};

export default Profile;
