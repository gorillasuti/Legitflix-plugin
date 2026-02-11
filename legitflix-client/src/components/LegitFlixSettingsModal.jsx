import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import BannerPickerModal from './BannerPickerModal';
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

    // Form State
    const [accentColor, setAccentColor] = useState(config.accentColor || '#ff7e00');
    const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');
    const [showCategories, setShowCategories] = useState(config.showNavbarCategories !== false);
    const [enableJellyseerr, setEnableJellyseerr] = useState(config.enableJellyseerr !== false);
    const [jellyseerrUrl, setJellyseerrUrl] = useState(config.jellyseerrUrl || 'https://request.legitflix.eu');
    const [showLibraryTitles, setShowLibraryTitles] = useState(config.showLibraryTitles !== false);
    const [showNavbarRequests, setShowNavbarRequests] = useState(config.showNavbarRequests !== false);
    const [customHex, setCustomHex] = useState('');

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
            setSearchQuery('');

            if (!PRESET_COLORS.some(c => c.value === config.accentColor)) {
                setCustomHex(config.accentColor);
            }
        }
    }, [isOpen, config]);

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
        updateConfig({
            accentColor,
            logoUrl,
            logoType: logoUrl ? 'image' : 'text',
            showNavbarCategories: showCategories,
            enableJellyseerr,
            jellyseerrUrl,
            showLibraryTitles,
            showNavbarRequests
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
            id: 'appBackground',
            tab: 'appearance',
            label: 'App Background',
            keywords: ['background', 'wallpaper', 'image', 'custom'],
            render: () => (
                <div className="setting-section" key="appBackground">
                    <h3>App Background</h3>
                    <p className="setting-desc">Set a global background image for the application.</p>

                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{
                            width: '120px',
                            height: '68px',
                            borderRadius: '6px',
                            backgroundColor: '#2a2a2a',
                            backgroundImage: config.appBackground ? `url('${config.appBackground}')` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {!config.appBackground && <span className="material-icons" style={{ opacity: 0.3 }}>image</span>}
                        </div>
                        <div>
                            <button className="btn-save" style={{ padding: '6px 16px', fontSize: '0.9rem' }} onClick={() => setShowBannerPicker(true)}>
                                Change Background
                            </button>
                            {config.appBackground && (
                                <button
                                    className="btn-reset"
                                    style={{ marginLeft: '10px', padding: '6px 12px', fontSize: '0.9rem' }}
                                    onClick={() => updateConfig({ appBackground: null })}
                                >
                                    Reset
                                </button>
                            )}
                        </div>
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
            id: 'requestFeature',
            tab: 'home',
            label: 'Request Feature (Jellyseerr)',
            keywords: ['request', 'jellyseerr', 'ombi', 'home', 'card'],
            render: () => (
                <div className="setting-section" key="requestFeature">
                    <div className="setting-row">
                        <div>
                            <h3 className="setting-title">Request Feature</h3>
                            <p className="setting-desc">Enable "Request" card on Home screen</p>
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
                            <p className="setting-desc">Display the "Requests" link next to categories in the navbar</p>
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
                            <button className="btn-save" onClick={handleSave}>Save Changes</button>
                        </div>
                    </div>
                </div>
            </div>
            <BannerPickerModal
                isOpen={showBannerPicker}
                onClose={() => setShowBannerPicker(false)}
                onSave={(url) => {
                    updateConfig({ appBackground: url });
                    setShowBannerPicker(false);
                }}
                userId={userId}
            />
        </>
    );
};

export default LegitFlixSettingsModal;
