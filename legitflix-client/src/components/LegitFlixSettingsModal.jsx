import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { jellyfinService } from '../services/jellyfin';
import BannerPickerModal from './BannerPickerModal';
import AvatarPickerModal from './AvatarPickerModal';
import './LegitFlixSettingsModal.css';

const PRESET_COLORS = [
    { name: 'Orange', value: '#ff7e00' },
    { name: 'Blue', value: '#00aaff' },
    { name: 'Pink', value: '#ff00aa' },
    { name: 'Green', value: '#00ff7e' },
    { name: 'Red', value: '#ff3333' },
    { name: 'Purple', value: '#aa00ff' },
];

const LegitFlixSettingsModal = ({ isOpen, onClose, userId }) => {
    const { config, updateConfig } = useTheme();

    // Tab State
    const [activeTab, setActiveTab] = useState('appearance');
    const [searchQuery, setSearchQuery] = useState('');
    const [showBannerPicker, setShowBannerPicker] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState('app'); // 'app' | 'jellyseerr'
    const [uploading, setUploading] = useState(false);

    // Form State
    const [accentColor, setAccentColor] = useState(config.accentColor || '#ff7e00');
    const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');
    const [showCategories, setShowCategories] = useState(config.showNavbarCategories !== false);
    const [enableJellyseerr, setEnableJellyseerr] = useState(config.enableJellyseerr !== false);
    const [jellyseerrUrl, setJellyseerrUrl] = useState(config.jellyseerrUrl || 'https://request.legitflix.eu');
    const [showLibraryTitles, setShowLibraryTitles] = useState(config.showLibraryTitles !== false);
    const [showNavbarRequests, setShowNavbarRequests] = useState(config.showNavbarRequests !== false);
    const [customHex, setCustomHex] = useState('');
    const [contentTypes, setContentTypes] = useState(config.contentTypeFilters || { Movie: true, Series: true, MusicAlbum: false, Audio: false, MusicVideo: false });

    const [sortMode, setSortMode] = useState(config.contentSortMode || 'latest');
    // Player Settings State
    const [playerSeekForward, setPlayerSeekForward] = useState(config.playerSeekForward || 30);
    const [playerSeekBackward, setPlayerSeekBackward] = useState(config.playerSeekBackward || 10);
    const [defaultAudioLanguage, setDefaultAudioLanguage] = useState(config.defaultAudioLanguage || 'auto');
    const [defaultSubtitleLanguage, setDefaultSubtitleLanguage] = useState(config.defaultSubtitleLanguage || 'auto');
    const [autoSkipIntro, setAutoSkipIntro] = useState(config.autoSkipIntro || false);
    const [autoSkipOutro, setAutoSkipOutro] = useState(config.autoSkipOutro || false);
    // Subtitle Customization
    const [subSize, setSubSize] = useState(config.subtitleSize || '100%');
    const [subColor, setSubColor] = useState(config.subtitleColor || '#ffffff');
    const [subBackground, setSubBackground] = useState(config.subtitleBackground || 'drop-shadow');

    useEffect(() => {
        if (isOpen) {
            // Reset to current config when opening
            setAccentColor(config.accentColor || '#ff7e00');
            setLogoUrl(config.logoUrl || '');
            setShowCategories(config.showNavbarCategories !== false);
            setEnableJellyseerr(config.enableJellyseerr !== false);
            setJellyseerrUrl(config.jellyseerrUrl || 'https://request.legitflix.eu');
            setShowLibraryTitles(config.showLibraryTitles !== false);
            setShowNavbarRequests(config.showNavbarRequests !== false);
            setContentTypes(config.contentTypeFilters || { Movie: true, Series: true, MusicAlbum: false, Audio: false, MusicVideo: false });
            setSortMode(config.contentSortMode || 'latest');
            setPlayerSeekForward(config.playerSeekForward || 30);
            setPlayerSeekBackward(config.playerSeekBackward || 10);
            setDefaultAudioLanguage(config.defaultAudioLanguage || 'auto');
            setDefaultSubtitleLanguage(config.defaultSubtitleLanguage || 'auto');
            setAutoSkipIntro(config.autoSkipIntro || false);
            setAutoSkipOutro(config.autoSkipOutro || false);
            setSubSize(config.subtitleSize || '100%');
            setSubColor(config.subtitleColor || '#ffffff');
            setSubBackground(config.subtitleBackground || 'drop-shadow');
            setSearchQuery('');

            if (!PRESET_COLORS.some(c => c.value === config.accentColor)) {
                setCustomHex(config.accentColor);
            }
        }
    }, [isOpen, config]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleColorChange = (color) => {
        setAccentColor(color);
        setCustomHex('');
    };

    const handleCustomHexChange = (e) => {
        const val = e.target.value;
        setCustomHex(val);
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            setAccentColor(val);
        }
    };

    const handleSave = () => {
        // Compute media type arrays from checkboxes
        const enabledTypes = Object.entries(contentTypes).filter(([, v]) => v).map(([k]) => k);
        const heroStr = enabledTypes.length > 0 ? enabledTypes.join(',') : 'Movie,Series';
        const promoArr = enabledTypes.length > 0 ? enabledTypes : ['Movie', 'Series'];

        updateConfig({
            accentColor,
            logoUrl,
            logoType: logoUrl ? 'image' : 'text',
            showNavbarCategories: showCategories,
            enableJellyseerr,
            jellyseerrUrl,
            showLibraryTitles,
            showNavbarRequests,
            contentTypeFilters: contentTypes,
            heroMediaTypes: heroStr,
            promoMediaTypes: promoArr,
            contentSortMode: sortMode,
            playerSeekForward,
            playerSeekBackward,
            defaultAudioLanguage,
            defaultSubtitleLanguage,
            autoSkipIntro,
            autoSkipOutro,
            subtitleSize: subSize,
            subtitleColor: subColor,
            subtitleBackground: subBackground,
        });
        onClose();
    };

    const handleReset = () => {
        setAccentColor('#ff7e00');
        setLogoUrl('');
        setCustomHex('');
        setShowCategories(true);
        setEnableJellyseerr(true);
        setJellyseerrUrl('https://request.legitflix.eu');
        setShowLibraryTitles(true);
        setShowNavbarRequests(true);
        setContentTypes({ Movie: true, Series: true, MusicAlbum: false, Audio: false, MusicVideo: false });
        setSortMode('latest');
        setPlayerSeekForward(30);
        setPlayerSeekBackward(10);
        setDefaultAudioLanguage('auto');
        setDefaultSubtitleLanguage('auto');
        setSubSize('100%');
        setSubColor('#ffffff');
        setSubBackground('drop-shadow');
    };

    const handleAvatarFile = async (file) => {
        if (!file || !userId) return;
        setUploading(true);
        try {
            const res = await fetch(
                `${jellyfinService.api.basePath}/Users/${userId}/Images/Primary`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': file.type,
                        'X-Emby-Authorization': jellyfinService.api.authHeader,
                    },
                    body: file,
                }
            );
            if (res.ok) {
                setShowAvatarPicker(false);
                // Ideally trigger a refresh or notify user, but for now just close
            }
        } catch (err) {
            console.error("Avatar upload failed", err);
        } finally {
            setUploading(false);
        }
    };


    // --- Search Logic ---
    // If search is active, we ignore tabs and show all matching settings
    const settingsList = [
        {
            id: 'accentColor',
            tab: 'appearance',
            label: 'Accent Color',
            keywords: ['color', 'theme', 'style', 'appearance'],
            render: () => (
                <div className="setting-section" key="accentColor">
                    <h3>Accent Color</h3>
                    <div className="color-presets">
                        {PRESET_COLORS.map(c => (
                            <div
                                key={c.value}
                                className={`color-preset ${accentColor === c.value ? 'selected' : ''}`}
                                style={{ backgroundColor: c.value }}
                                onClick={() => handleColorChange(c.value)}
                                title={c.name}
                            >
                                {accentColor === c.value && <span className="material-icons">check</span>}
                            </div>
                        ))}
                    </div>
                    <div className="custom-color-input">
                        <label>Custom Hex:</label>
                        <input
                            type="text"
                            placeholder="#RRGGBB"
                            value={customHex}
                            onChange={handleCustomHexChange}
                            maxLength={7}
                        />
                        <div className="color-preview" style={{ backgroundColor: accentColor }}></div>
                    </div>
                </div>

            )
        },
        {
            id: 'logoUrl',
            tab: 'appearance',
            label: 'Custom Logo URL',
            keywords: ['logo', 'image', 'branding', 'appearance'],
            render: () => (
                <div className="setting-section" key="logoUrl">
                    <h3>Custom Logo URL</h3>
                    <p className="setting-desc">Enter a direct URL to an image to replace the top-left logo.</p>
                    <input
                        type="text"
                        className="legit-input"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                    />
                </div>
            )
        },
        {
            id: 'faviconUrl',
            tab: 'appearance',
            label: 'Custom Favicon URL',
            keywords: ['favicon', 'icon', 'tab', 'browser', 'branding'],
            render: () => (
                <div className="setting-section" key="faviconUrl">
                    <h3>Custom Favicon URL</h3>
                    <p className="setting-desc">Enter a direct URL to an image to use as the browser tab icon.</p>
                    <input
                        type="text"
                        className="legit-input"
                        placeholder="https://example.com/favicon.ico"
                        value={config.faviconUrl || ''}
                        onChange={(e) => updateConfig({ faviconUrl: e.target.value })}
                    />
                </div>
            )
        },
        {
            id: 'avatar',
            tab: 'appearance',
            label: 'Profile Avatar',
            keywords: ['avatar', 'profile', 'image', 'picture', 'user'],
            render: () => (
                <div className="setting-section" key="avatar">
                    <h3>Profile Avatar</h3>
                    <p className="setting-desc">Change your user profile picture.</p>
                    <div className="setting-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <img
                                src={`${jellyfinService.api.basePath}/Users/${userId}/Images/Primary?quality=90&t=${Date.now()}`}
                                alt="Current Avatar"
                                style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <button className="lf-btn lf-btn--secondary" onClick={() => setShowAvatarPicker(true)}>
                                <span className="material-icons" style={{ fontSize: '18px', marginRight: '8px' }}>face</span>
                                Change Avatar
                            </button>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'requestFeature',
            tab: 'home',
            label: 'Request Feature (Jellyseerr)',
            keywords: ['request', 'jellyseerr', 'ombi', 'home', 'card'],
            render: () => (
                <>
                    <div className="setting-section" key="requestFeature">
                        <div className="setting-row">
                            <div>
                                <h3 className="setting-title">Request Feature</h3>
                                <p className="setting-desc">Enable "{config.jellyseerrText || 'Request'}" card on Home screen</p>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={enableJellyseerr}
                                    onChange={(e) => setEnableJellyseerr(e.target.checked)}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>

                        <div className="fade-in" style={{ marginTop: '10px' }}>
                            <p className="setting-desc">Request URL (Required for both Home Card and Navbar):</p>
                            <input
                                type="text"
                                className="legit-input"
                                placeholder="https://request.legitflix.eu"
                                value={jellyseerrUrl}
                                onChange={(e) => setJellyseerrUrl(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="setting-section" key="requestFeatureCustomization">
                        <h3>Card Appearance</h3>
                        <p className="setting-desc">Customize the look of the Request card on the Home screen.</p>

                        <div className="setting-row" style={{ marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="setting-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Card Title</label>
                                <input
                                    type="text"
                                    className="legit-input"
                                    placeholder="Request Feature"
                                    value={config.jellyseerrText || ''}
                                    onChange={(e) => updateConfig({ jellyseerrText: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                            <div>
                                <label className="setting-label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Card Background URL</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '120px',
                                        height: '68px',
                                        borderRadius: '6px',
                                        backgroundColor: '#2a2a2a',
                                        backgroundImage: `url('${config.jellyseerrBackground || 'https://raw.githubusercontent.com/gorillasuti/Legitflix-plugin/refs/heads/main/legitflix-client/public/jellyseerr.jpg'}')`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        flexShrink: 0
                                    }} />
                                    <input
                                        type="text"
                                        className="legit-input"
                                        style={{ marginTop: 0 }}
                                        placeholder="https://example.com/background.jpg"
                                        value={config.jellyseerrBackground || ''}
                                        onChange={(e) => updateConfig({ jellyseerrBackground: e.target.value || null })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </>
            )
        },
        {
            id: 'libraryTitles',
            tab: 'home',
            label: 'Show Library Titles',
            keywords: ['library', 'names', 'titles', 'overlay', 'home'],
            render: () => (
                <div className="setting-section" key="libraryTitles">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Show Library Titles</h3>
                            <p className="setting-desc">Display text overlay on library cards</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={showLibraryTitles}
                                onChange={(e) => setShowLibraryTitles(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )
        },
        {
            id: 'contentFilters',
            tab: 'home',
            label: 'Content Filters',
            keywords: ['content', 'media', 'type', 'movie', 'series', 'music', 'filter', 'carousel', 'promo', 'hero'],
            render: () => {
                const MEDIA_TYPES = [
                    { key: 'Movie', label: 'Movies', icon: 'movie' },
                    { key: 'Series', label: 'Series', icon: 'tv' },
                    { key: 'MusicAlbum', label: 'Music Albums', icon: 'album' },
                    { key: 'Audio', label: 'Audio', icon: 'audiotrack' },
                    { key: 'MusicVideo', label: 'Music Videos', icon: 'music_video' },
                ];
                return (
                    <div className="setting-section" key="contentFilters">
                        <h3>Content Filters</h3>
                        <p className="setting-desc">Choose which media types appear in the Hero Carousel and Promo Banner.</p>
                        <div className="content-type-grid">
                            {MEDIA_TYPES.map(t => (
                                <label key={t.key} className={`content-type-chip ${contentTypes[t.key] ? 'active' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={!!contentTypes[t.key]}
                                        onChange={(e) => setContentTypes(prev => ({ ...prev, [t.key]: e.target.checked }))}
                                    />
                                    <span className="material-icons">{t.icon}</span>
                                    <span>{t.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            }
        },
        {
            id: 'displayOrder',
            tab: 'home',
            label: 'Display Order',
            keywords: ['sort', 'order', 'random', 'latest', 'rated', 'carousel', 'promo', 'display'],
            render: () => {
                const SORT_MODES = [
                    { key: 'latest', label: 'Latest', icon: 'schedule', desc: 'Newest additions first' },
                    { key: 'random', label: 'Random', icon: 'shuffle', desc: 'Shuffled each visit' },
                    { key: 'topRated', label: 'Top Rated', icon: 'star', desc: 'Highest community rating' },
                ];
                return (
                    <div className="setting-section" key="displayOrder">
                        <h3>Display Order</h3>
                        <p className="setting-desc">How content is sorted in the Hero Carousel and Promo Banner.</p>
                        <div className="content-type-grid">
                            {SORT_MODES.map(m => (
                                <label
                                    key={m.key}
                                    className={`content-type-chip ${sortMode === m.key ? 'active' : ''}`}
                                    title={m.desc}
                                >
                                    <input
                                        type="radio"
                                        name="sortMode"
                                        checked={sortMode === m.key}
                                        onChange={() => setSortMode(m.key)}
                                    />
                                    <span className="material-icons">{m.icon}</span>
                                    <span>{m.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            }
        },
        {
            id: 'navbarCategories',
            tab: 'navigation',
            label: 'Show Categories in Navbar',
            keywords: ['navigation', 'menu', 'navbar', 'categories', 'links'],
            render: () => (
                <div className="setting-section" key="navbarCategories">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Show Categories in Navbar</h3>
                            <p className="setting-desc">Display library links in the top navigation bar</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={showCategories}
                                onChange={(e) => setShowCategories(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )
        },
        {
            id: 'navbarRequests',
            tab: 'navigation',
            label: 'Show Requests in Navbar',
            keywords: ['navigation', 'navbar', 'requests', 'jellyseerr'],
            render: () => (
                <div className="setting-section" key="navbarRequests">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Show Requests in Navbar</h3>

                            <p className="setting-desc">Display the "{config.jellyseerrText || 'Requests'}" link next to categories in the navbar</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={showNavbarRequests}
                                onChange={(e) => setShowNavbarRequests(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )
        },
        {
            id: 'playerSeek',
            tab: 'player',
            label: 'Seek Durations',
            keywords: ['player', 'seek', 'skip', 'forward', 'backward', 'time'],
            render: () => (
                <div className="setting-section" key="playerSeek">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Seek Durations</h3>
                            <p className="setting-desc">Customize how many seconds to skip forward or backward.</p>
                        </div>
                    </div>
                    <div className="setting-row" style={{ alignItems: 'flex-start', gap: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <label className="setting-label">Seek Forward (Right Arrow)</label>
                            <div className="time-stepper">
                                <button
                                    className="stepper-btn"
                                    onClick={() => setPlayerSeekForward(prev => Math.max(5, prev - 5))}
                                    disabled={playerSeekForward <= 5}
                                >
                                    <span className="material-icons">remove</span>
                                </button>
                                <div className="stepper-value">
                                    <span className="stepper-number">{playerSeekForward}</span>
                                    <span className="stepper-unit">sec</span>
                                </div>
                                <button
                                    className="stepper-btn"
                                    onClick={() => setPlayerSeekForward(prev => Math.min(300, prev + 5))}
                                    disabled={playerSeekForward >= 300}
                                >
                                    <span className="material-icons">add</span>
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="setting-label">Seek Backward (Left Arrow)</label>
                            <div className="time-stepper">
                                <button
                                    className="stepper-btn"
                                    onClick={() => setPlayerSeekBackward(prev => Math.max(5, prev - 5))}
                                    disabled={playerSeekBackward <= 5}
                                >
                                    <span className="material-icons">remove</span>
                                </button>
                                <div className="stepper-value">
                                    <span className="stepper-number">{playerSeekBackward}</span>
                                    <span className="stepper-unit">sec</span>
                                </div>
                                <button
                                    className="stepper-btn"
                                    onClick={() => setPlayerSeekBackward(prev => Math.min(300, prev + 5))}
                                    disabled={playerSeekBackward >= 300}
                                >
                                    <span className="material-icons">add</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'playerLanguages',
            tab: 'player',
            label: 'Default Languages',
            keywords: ['player', 'audio', 'subtitle', 'language', 'default', 'dub'],
            render: () => {
                const LANGUAGES = [
                    { code: 'auto', label: 'Auto (Server Default)' },
                    { code: 'eng', label: 'English' },
                    { code: 'hun', label: 'Hungarian (Magyar)' },
                    { code: 'ger', label: 'German (Deutsch)' },
                    { code: 'jpn', label: 'Japanese (日本語)' },
                    { code: 'spa', label: 'Spanish (Español)' },
                    { code: 'fre', label: 'French (Français)' },
                    { code: 'ita', label: 'Italian (Italiano)' },
                    { code: 'por', label: 'Portuguese (Português)' },
                    { code: 'rus', label: 'Russian (Русский)' },
                    { code: 'chi', label: 'Chinese (中文)' },
                    { code: 'kor', label: 'Korean (한국어)' },
                    { code: 'ara', label: 'Arabic (العربية)' },
                    { code: 'hin', label: 'Hindi (हिन्दी)' },
                    { code: 'pol', label: 'Polish (Polski)' },
                    { code: 'dut', label: 'Dutch (Nederlands)' },
                    { code: 'swe', label: 'Swedish (Svenska)' },
                    { code: 'nor', label: 'Norwegian (Norsk)' },
                    { code: 'dan', label: 'Danish (Dansk)' },
                    { code: 'fin', label: 'Finnish (Suomi)' },
                    { code: 'tur', label: 'Turkish (Türkçe)' },
                    { code: 'tha', label: 'Thai (ไทย)' },
                    { code: 'vie', label: 'Vietnamese (Tiếng Việt)' },
                    { code: 'ukr', label: 'Ukrainian (Українська)' },
                    { code: 'cze', label: 'Czech (Čeština)' },
                    { code: 'rum', label: 'Romanian (Română)' },
                    { code: 'gre', label: 'Greek (Ελληνικά)' },
                    { code: 'heb', label: 'Hebrew (עברית)' },
                ];

                const SUBTITLE_LANGUAGES = [
                    { code: 'auto', label: 'Auto (Server Default)' },
                    { code: 'none', label: 'None (Disabled)' },
                    ...LANGUAGES.filter(l => l.code !== 'auto'),
                ];

                return (
                    <div className="setting-section" key="playerLanguages">
                        <div className="setting-row">
                            <div>
                                <h3 className="setting-title">Default Languages</h3>
                                <p className="setting-desc">Preferred audio and subtitle languages for new playback.</p>
                            </div>
                        </div>
                        <div className="setting-row" style={{ alignItems: 'flex-start', gap: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label className="setting-label">Default Audio Language</label>
                                <select
                                    className="legit-input"
                                    value={defaultAudioLanguage}
                                    onChange={(e) => setDefaultAudioLanguage(e.target.value)}
                                >
                                    {LANGUAGES.map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="setting-label">Default Subtitle Language</label>
                                <select
                                    className="legit-input"
                                    value={defaultSubtitleLanguage}
                                    onChange={(e) => setDefaultSubtitleLanguage(e.target.value)}
                                >
                                    {SUBTITLE_LANGUAGES.map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                );
            }
        },
        {
            id: 'playerAutoSkip',
            tab: 'player',
            label: 'Auto Skip',
            keywords: ['player', 'skip', 'intro', 'outro', 'auto', 'chapter'],
            render: () => (
                <div className="setting-section" key="playerAutoSkip">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Auto Skip Intro</h3>
                            <p className="setting-desc">Automatically skip intro segments when detected by Jellyfin chapters.</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={autoSkipIntro}
                                onChange={(e) => setAutoSkipIntro(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Auto Skip Outro</h3>
                            <p className="setting-desc">Automatically skip outro/credits segments when detected by Jellyfin chapters.</p>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={autoSkipOutro}
                                onChange={(e) => setAutoSkipOutro(e.target.checked)}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>
            )
        },
        {
            id: 'subtitleAppearance',
            tab: 'player',
            label: 'Subtitle Appearance',
            keywords: ['subtitle', 'appearance', 'style', 'color', 'size', 'background', 'font'],
            render: () => (
                <div className="setting-section" key="subtitleAppearance">
                    <h3 className="setting-title">Subtitle Appearance</h3>
                    <p className="setting-desc">Customize how subtitles look in the player.</p>

                    <div className="setting-row" style={{ alignItems: 'flex-start', gap: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <label className="setting-label">Size</label>
                            <select
                                className="legit-input"
                                value={subSize}
                                onChange={(e) => setSubSize(e.target.value)}
                            >
                                <option value="75%">Small</option>
                                <option value="100%">Medium</option>
                                <option value="125%">Large</option>
                                <option value="150%">Extra Large</option>
                                <option value="200%">Huge</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="setting-label">Background Style</label>
                            <select
                                className="legit-input"
                                value={subBackground}
                                onChange={(e) => setSubBackground(e.target.value)}
                            >
                                <option value="none">None</option>
                                <option value="drop-shadow">Drop Shadow</option>
                                <option value="outline">Outline</option>
                                <option value="box">Box (Semi-Transparent)</option>
                            </select>
                        </div>
                    </div>

                    <div className="setting-row" style={{ marginTop: '16px', display: 'block' }}>
                        <label className="setting-label" style={{ marginBottom: '8px', display: 'block' }}>Text Color</label>
                        <div className="color-presets" style={{ gap: '10px' }}>
                            {[
                                { name: 'White', value: '#ffffff' },
                                { name: 'Yellow', value: '#ffff00' },
                                { name: 'Cyan', value: '#00ffff' },
                                { name: 'Green', value: '#00ff00' },
                                { name: 'Magenta', value: '#ff00ff' },
                                { name: 'Red', value: '#ff0000' },
                                { name: 'Black', value: '#000000' }
                            ].map(c => (
                                <div
                                    key={c.value}
                                    className={`color-preset ${subColor === c.value ? 'selected' : ''}`}
                                    style={{ backgroundColor: c.value, width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', border: subColor === c.value ? '2px solid white' : '1px solid #444', position: 'relative' }}
                                    onClick={() => setSubColor(c.value)}
                                    title={c.name}
                                >
                                    {subColor === c.value && <span className="material-icons" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '18px', color: c.value === '#ffffff' || c.value === '#ffff00' || c.value === '#00ff00' || c.value === '#00ffff' ? 'black' : 'white' }}>check</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const filteredSettings = settingsList.filter(s => {
        if (!searchQuery) return s.tab === activeTab;
        const q = searchQuery.toLowerCase();
        return s.label.toLowerCase().includes(q) || s.keywords.some(k => k.includes(q));
    });

    if (!isOpen) return null;

    return (
        <>
            <div className="legit-settings-overlay" onClick={onClose}>
                <div className="legit-settings-modal expanded" onClick={e => e.stopPropagation()}>
                    <div className="legit-settings-sidebar">
                        <div className="sidebar-header">
                            <h2>Settings</h2>
                        </div>
                        <div className="sidebar-tabs">
                            <button
                                className={`sidebar-tab ${activeTab === 'appearance' && !searchQuery ? 'active' : ''}`}
                                onClick={() => { setActiveTab('appearance'); setSearchQuery(''); }}
                            >
                                <span className="material-icons">palette</span> Appearance
                            </button>
                            <button
                                className={`sidebar-tab ${activeTab === 'home' && !searchQuery ? 'active' : ''}`}
                                onClick={() => { setActiveTab('home'); setSearchQuery(''); }}
                            >
                                <span className="material-icons">home</span> Home Screen
                            </button>
                            <button
                                className={`sidebar-tab ${activeTab === 'navigation' && !searchQuery ? 'active' : ''}`}
                                onClick={() => { setActiveTab('navigation'); setSearchQuery(''); }}
                            >
                                <span className="material-icons">menu</span> Navigation
                            </button>
                            <button
                                className={`sidebar-tab ${activeTab === 'player' && !searchQuery ? 'active' : ''}`}
                                onClick={() => { setActiveTab('player'); setSearchQuery(''); }}
                            >
                                <span className="material-icons">play_circle</span> Player
                            </button>
                        </div>
                    </div>

                    <div className="legit-settings-content">
                        <div className="content-header">
                            <div className="search-container">
                                <span className="material-icons search-icon">search</span>
                                <input
                                    type="text"
                                    placeholder="Search settings..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {searchQuery && (
                                    <button className="clear-search" onClick={() => setSearchQuery('')}>
                                        <span className="material-icons">close</span>
                                    </button>
                                )}
                            </div>
                            <button className="close-btn-icon" onClick={onClose}>&times;</button>
                        </div>

                        <div className="content-body">
                            {filteredSettings.length > 0 ? (
                                filteredSettings.map(s => s.render())
                            ) : (
                                <div className="no-results">
                                    <span className="material-icons">search_off</span>
                                    <p>No settings found for "{searchQuery}"</p>
                                </div>
                            )}
                        </div>

                        <div className="content-footer">
                            <button className="btn-reset" onClick={handleReset}>Reset Defaults</button>
                            <button className="btn-save lf-btn--ring-hover" onClick={handleSave}>Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
            <BannerPickerModal
                isOpen={showBannerPicker}
                onClose={() => setShowBannerPicker(false)}
                onSave={(url) => {
                    if (pickerMode === 'app') {
                        updateConfig({ appBackground: url });
                    } else if (pickerMode === 'jellyseerr') {
                        updateConfig({ jellyseerrBackground: url });
                    }
                    setShowBannerPicker(false);
                }}
                userId={userId}
            />
            <AvatarPickerModal
                isOpen={showAvatarPicker}
                onClose={() => setShowAvatarPicker(false)}
                onSave={handleAvatarFile}
                userId={userId}
            />
        </>
    );
};

export default LegitFlixSettingsModal;
