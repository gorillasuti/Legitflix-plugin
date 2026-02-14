
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme, getDefaultLogo } from '../context/ThemeContext';
import { jellyfinService } from '../services/jellyfin';
import SearchModal from './SearchModal/SearchModal';
import LegitFlixSettingsModal from './LegitFlixSettingsModal';
import QuickConnectModal from './QuickConnectModal';
import ProfileModal from './ProfileModal';
import AvatarPickerModal from './AvatarPickerModal';
import './Navbar.css';

const Navbar = ({ alwaysFilled = false }) => {
    const { config } = useTheme();
    const [user, setUser] = useState(null);
    const [libraries, setLibraries] = useState([]);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showLegitSettings, setShowLegitSettings] = useState(false);
    const [showQuickConnect, setShowQuickConnect] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [hasEnhancedPlugin, setHasEnhancedPlugin] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const navigate = useNavigate();
    const dropdownRef = React.useRef(null);

    // Fetch User and Libraries
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const u = await jellyfinService.getCurrentUser();
                setUser(u);
                if (u && config.showNavbarCategories) {
                    const libs = await jellyfinService.getUserViews(u.Id);
                    if (libs && libs.Items) {
                        setLibraries(libs.Items);
                    }
                }
            } catch (err) {
                console.error("Navbar fetch error", err);
            }
        };
        fetchUserData();
    }, [config.showNavbarCategories]); // Re-fetch if toggle changes

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const closeMenu = (e) => {
            if (!e.target.closest('.nav-avatar-container')) {
                setShowMenu(false);
            }
        };
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, []);

    // Global Search Shortcut (F4)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F4') {
                e.preventDefault();
                setShowSearch(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Fetch User and Libraries
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const u = await jellyfinService.getCurrentUser();
                setUser(u);
                if (u && config.showNavbarCategories) {
                    const libs = await jellyfinService.getUserViews(u.Id);
                    if (libs && libs.Items) {
                        setLibraries(libs.Items);
                    }
                }
            } catch (err) {
                console.error("Navbar fetch error", err);
            }
        };
        fetchUserData();
    }, [config.showNavbarCategories]); // Re-fetch if toggle changes

    const isAdmin = user?.Policy?.IsAdministrator;

    const handleAvatarFile = async (file) => {
        if (!file || !user?.Id) return;
        setUploading(true);
        try {
            await jellyfinService.uploadUserImage(user.Id, 'Primary', file);

            setShowAvatarPicker(false);
            // Dispatch event to update avatar everywhere
            window.dispatchEvent(new CustomEvent('userUpdated', { detail: user }));
            // Force reload to ensure cache busting isn't the only reliance
            window.location.reload();
        } catch (err) {
            console.error("Avatar upload failed", err);
            alert("Failed to upload avatar. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <nav className={`navbar ${isScrolled || alwaysFilled ? 'scrolled' : ''}`}>
                <div className="nav-content">

                    {/* Left Section: Logo & Categories */}
                    <div className="nav-start">
                        <Link to="/" className="nav-logo">
                            {config.logoUrl ? (
                                <img src={config.logoUrl} alt={config.appName} />
                            ) : (
                                <img src={getDefaultLogo(config.accentColor)} alt={config.appName} />
                            )}
                        </Link>

                        <div className="nav-links primary-links">
                            {/* Hide Home if Categories are disabled */}
                            {/* {config.showNavbarCategories && (
                                <Link to="/" className="nav-link">Home</Link>
                            )} */}
                            {/* Real Jellyfin library categories */}
                            {config.showNavbarCategories && libraries.map(lib => (
                                <span
                                    key={lib.Id}
                                    className="nav-link"
                                    onClick={() => navigate(`/library/${lib.Id}`)}
                                >
                                    {lib.Name}
                                </span>
                            ))}

                            {/* Divider + Requests — only if setting enabled */}
                            {config.jellyseerrUrl && config.showNavbarRequests !== false && (
                                <>
                                    <span className="nav-divider" />
                                    <span
                                        className="nav-link"
                                        onClick={() => window.open(config.jellyseerrUrl, '_blank')}
                                    >
                                        {config.jellyseerrText || 'Request'}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Section: Icons & Profile */}
                    <div className="nav-end">
                        <div className="nav-actions">
                            {/* Desktop Actions */}
                            <div className="desktop-actions">
                                {/* Search Icon - Toggleable */}
                                {config.showNavbarSearch !== false && (
                                    <button
                                        className="nav-icon-btn"
                                        onClick={() => setShowSearch(true)}
                                        title="Search (F4)"
                                    >
                                        <span className="material-icons">search</span>
                                    </button>
                                )}

                                {/* Favorites / Bookmarks - Toggleable */}
                                {config.showNavbarBookmarks !== false && (
                                    <Link to="/favorites" className="nav-icon-btn" title="My List">
                                        <span className="material-icons">bookmark_border</span>
                                    </Link>
                                )}

                                {/* Random Button */}
                                {config.showNavbarRandom !== false && (
                                    <button
                                        className="nav-icon-btn"
                                        onClick={async () => {
                                            try {
                                                const filters = config.randomContentFilters || { Movie: true, Series: true, Episode: true };
                                                const includeItemTypes = Object.entries(filters)
                                                    .filter(([_, enabled]) => enabled)
                                                    .map(([type]) => type);

                                                if (includeItemTypes.length === 0) {
                                                    alert("Please select at least one content type in Theme Settings > Content.");
                                                    return;
                                                }

                                                const user = await jellyfinService.getCurrentUser();
                                                if (!user) return;

                                                const query = {
                                                    sortBy: ['Random'],
                                                    limit: 1,
                                                    recursive: true,
                                                    includeItemTypes: includeItemTypes,
                                                    fields: ['MediaSources', 'SeriesId']
                                                };

                                                if (config.randomLibraries && config.randomLibraries.length > 0) {
                                                    query.parentId = config.randomLibraries.join(',');
                                                }

                                                const result = await jellyfinService.getItems(user.Id, query);

                                                if (result && result.Items && result.Items.length > 0) {
                                                    const item = result.Items[0];
                                                    if (item.Type === 'Movie') {
                                                        navigate(`/movie/${item.Id}`);
                                                    } else if (item.Type === 'Series') {
                                                        navigate(`/series/${item.Id}`);
                                                    } else if (item.Type === 'Episode' && item.SeriesId) {
                                                        navigate(`/series/${item.SeriesId}`);
                                                    } else {
                                                        navigate(`/item/${item.Id}`);
                                                    }
                                                } else {
                                                    alert("No items found to play randomly.");
                                                }
                                            } catch (e) {
                                                console.error("Random play failed", e);
                                            }
                                        }}
                                        title="Random - I'm feeling lucky"
                                    >
                                        <span className="material-icons">casino</span>
                                    </button>
                                )}
                            </div>

                            {/* Mobile Hamburger */}
                            <button
                                className="nav-icon-btn mobile-hamburger"
                                onClick={() => setShowMenu(true)} // Reusing showMenu for simplicity or create new state? Let's check existing usage.
                            // Existing showMenu is for Profile Dropdown. We should create a separate state for Mobile Menu or unify. 
                            // Let's use a new state: showMobileMenu
                            >
                                <span className="material-icons">menu</span>
                            </button>

                            {/* User Profile & Menu (Desktop) */}
                            <div
                                className={`nav-avatar-container ${showMenu ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                ref={dropdownRef}
                            >
                                {user ? (
                                    <div className="nav-avatar-wrapper">
                                        <img
                                            src={`${jellyfinService.api.basePath}/Users/${user.Id}/Images/Primary?quality=90&${new Date().getTime()}`}
                                            alt={user.Name}
                                            className="nav-avatar"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                        <span className="material-icons avatar-arrow">expand_more</span>
                                    </div>
                                ) : (
                                    <div className="nav-avatar-wrapper">
                                        <span className="material-icons nav-avatar-placeholder">account_circle</span>
                                        <span className="material-icons avatar-arrow">expand_more</span>
                                    </div>
                                )}

                                {showMenu && (
                                    <div className="nav-dropdown-menu usermenu">
                                        {/* User Header */}
                                        {user && (
                                            <div className="user-menu-header" onClick={() => { setShowMenu(false); setShowProfileModal(true); }}>
                                                <div className="header-avatar-container">
                                                    <img
                                                        src={`${jellyfinService.api.basePath}/Users/${user.Id}/Images/Primary?quality=90&${new Date().getTime()}`}
                                                        alt={user.Name}
                                                        className="menu-avatar"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                </div>
                                                <div className="user-menu-info">
                                                    <span className="user-name">{user.Name}</span>
                                                    <span className="user-status">
                                                        <span className="material-icons">{isAdmin ? 'shield' : 'person'}</span>
                                                        {isAdmin ? 'Administrator' : 'User'}
                                                    </span>
                                                </div>
                                                <span className="material-icons edit-icon">edit</span>
                                            </div>
                                        )}

                                        {/* General */}
                                        <div className="menu-section-label">General</div>
                                        <button onClick={() => { setShowMenu(false); setShowSearch(true); }}>
                                            <span className="material-icons">search</span> Search
                                        </button>
                                        <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html?classic#!/remotecontrol'; }}>
                                            <span className="material-icons">cast</span> Cast to Device
                                        </button>
                                        <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html?classic#!/syncplay'; }}>
                                            <span className="material-icons">sync</span> SyncPlay
                                        </button>
                                        <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html?classic#!/playback'; }}>
                                            <span className="material-icons">play_circle</span> Player
                                        </button>
                                        {hasEnhancedPlugin && (
                                            <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html?classic#!/randomitems'; }}>
                                                <span className="material-icons">shuffle</span> Random
                                            </button>
                                        )}

                                        {/* Administration (admin only) */}
                                        {isAdmin && (
                                            <>
                                                <div className="dropdown-divider"></div>
                                                <div className="menu-section-label">Administration</div>
                                                <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html?classic#!/dashboard'; }}>
                                                    <span className="material-icons">dashboard</span> Dashboard
                                                </button>
                                            </>
                                        )}

                                        {/* Preferences */}
                                        <div className="dropdown-divider"></div>
                                        <div className="menu-section-label">Preferences</div>
                                        <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html?#/profile'; }}>
                                            <span className="material-icons">settings</span> User Settings
                                        </button>
                                        <button onClick={() => { setShowMenu(false); setShowLegitSettings(true); }}>
                                            <span className="material-icons">palette</span> Theme Settings
                                        </button>
                                        {hasEnhancedPlugin && (
                                            <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html#!/configurationpage?name=JellyfinEnhanced'; }}>
                                                <span className="material-icons">auto_awesome</span> Jellyfin Enhanced
                                            </button>
                                        )}

                                        {/* Account */}
                                        <div className="dropdown-divider"></div>
                                        <div className="menu-section-label">Account</div>
                                        <button onClick={() => { setShowMenu(false); setShowAvatarPicker(true); }}>
                                            <span className="material-icons">face</span> Change Avatar
                                        </button>
                                        <button onClick={() => { setShowMenu(false); setShowQuickConnect(true); }}>
                                            <span className="material-icons">qr_code</span> Quick Connect
                                        </button>
                                        <button onClick={() => { setShowMenu(false); navigate('/login/select-server'); }}>
                                            <span className="material-icons">dns</span> Change Server
                                        </button>
                                        <button onClick={() => {
                                            setShowMenu(false);
                                            localStorage.removeItem('jellyfin_credentials');
                                            window.location.reload();
                                        }}>
                                            <span className="material-icons">logout</span> Log Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Fullscreen Menu */}
            <div className={`mobile-menu-overlay ${showMobileMenu ? 'active' : ''}`} onClick={() => setShowMobileMenu(false)}>
                <div className="mobile-menu-drawer" onClick={(e) => e.stopPropagation()}>
                    <div className="mobile-menu-header">
                        <span className="mobile-menu-title">Menu</span>
                        <button className="mobile-menu-close" onClick={() => setShowMobileMenu(false)}>
                            <span className="material-icons">close</span>
                        </button>
                    </div>

                    <div className="mobile-menu-content">
                        {/* Quick Actions (The buttons we hid) */}
                        <div className="mobile-menu-section">
                            <h3 className="mobile-section-label">Quick Actions</h3>
                            <div className="mobile-actions-grid">
                                {config.showNavbarSearch !== false && (
                                    <button
                                        className="mobile-action-btn"
                                        onClick={() => { setShowMobileMenu(false); setShowSearch(true); }}
                                    >
                                        <span className="material-icons">search</span>
                                        <span>Search</span>
                                    </button>
                                )}
                                {config.showNavbarBookmarks !== false && (
                                    <button
                                        className="mobile-action-btn"
                                        onClick={() => { setShowMobileMenu(false); navigate('/favorites'); }}
                                    >
                                        <span className="material-icons">bookmark</span>
                                        <span>My List</span>
                                    </button>
                                )}
                                {config.showNavbarRandom !== false && (
                                    <button
                                        className="mobile-action-btn"
                                        onClick={async () => {
                                            setShowMobileMenu(false);
                                            try {
                                                const filters = config.randomContentFilters || { Movie: true, Series: true, Episode: true };
                                                const includeItemTypes = Object.entries(filters)
                                                    .filter(([_, enabled]) => enabled)
                                                    .map(([type]) => type);

                                                if (includeItemTypes.length === 0) {
                                                    alert("Please select at least one content type in Theme Settings > Content.");
                                                    return;
                                                }

                                                const user = await jellyfinService.getCurrentUser();
                                                if (!user) return;

                                                const query = {
                                                    sortBy: ['Random'],
                                                    limit: 1,
                                                    recursive: true,
                                                    includeItemTypes: includeItemTypes,
                                                    fields: ['MediaSources', 'SeriesId']
                                                };

                                                if (config.randomLibraries && config.randomLibraries.length > 0) {
                                                    query.parentId = config.randomLibraries.join(',');
                                                }

                                                const result = await jellyfinService.getItems(user.Id, query);

                                                if (result && result.Items && result.Items.length > 0) {
                                                    const item = result.Items[0];
                                                    if (item.Type === 'Movie') {
                                                        navigate(`/movie/${item.Id}`);
                                                    } else if (item.Type === 'Series') {
                                                        navigate(`/series/${item.Id}`);
                                                    } else if (item.Type === 'Episode' && item.SeriesId) {
                                                        navigate(`/series/${item.SeriesId}`);
                                                    } else {
                                                        navigate(`/item/${item.Id}`);
                                                    }
                                                } else {
                                                    alert("No items found to play randomly.");
                                                }
                                            } catch (e) {
                                                console.error("Random play failed", e);
                                            }
                                        }}
                                    >
                                        <span className="material-icons">casino</span>
                                        <span>Random</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Libraries / Categories */}
                        {config.showNavbarCategories && (
                            <div className="mobile-menu-section">
                                <h3 className="mobile-section-label">Categories</h3>
                                <div className="mobile-links-list">
                                    <button
                                        className="mobile-link-item"
                                        onClick={() => { setShowMobileMenu(false); navigate('/'); }}
                                    >
                                        <span className="material-icons">home</span>
                                        Home
                                    </button>
                                    {libraries.map(lib => (
                                        <button
                                            key={lib.Id}
                                            className="mobile-link-item"
                                            onClick={() => { setShowMobileMenu(false); navigate(`/library/${lib.Id}`); }}
                                        >
                                            <span className="material-icons">
                                                {lib.CollectionType === 'movies' ? 'movie' :
                                                    lib.CollectionType === 'tvshows' ? 'tv' : 'folder'}
                                            </span>
                                            {lib.Name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Other Links */}
                        {config.jellyseerrUrl && config.showNavbarRequests !== false && (
                            <div className="mobile-menu-section">
                                <h3 className="mobile-section-label">External</h3>
                                <button
                                    className="mobile-link-item"
                                    onClick={() => { setShowMobileMenu(false); window.open(config.jellyseerrUrl, '_blank'); }}
                                >
                                    <span className="material-icons">campaign</span>
                                    {config.jellyseerrText || 'Request Feature'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
            <LegitFlixSettingsModal isOpen={showLegitSettings} onClose={() => setShowLegitSettings(false)} userId={user?.Id} />
            <QuickConnectModal isOpen={showQuickConnect} onClose={() => setShowQuickConnect(false)} />
            <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} user={user} />
            <AvatarPickerModal
                isOpen={showAvatarPicker}
                onClose={() => setShowAvatarPicker(false)}
                onSave={handleAvatarFile}
                userId={user?.Id}
                uploading={uploading}
            />
        </>
    );
};

export default Navbar;
