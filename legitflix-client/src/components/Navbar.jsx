
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme, getDefaultLogo } from '../context/ThemeContext';
import { jellyfinService } from '../services/jellyfin';
import SearchModal from './SearchModal/SearchModal';
import LegitFlixSettingsModal from './LegitFlixSettingsModal';
import QuickConnectModal from './QuickConnectModal';
import ProfileModal from './ProfileModal';
import './Navbar.css';

const Navbar = () => {
    const { config } = useTheme();
    const [user, setUser] = useState(null);
    const [libraries, setLibraries] = useState([]);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showLegitSettings, setShowLegitSettings] = useState(false);
    const [showQuickConnect, setShowQuickConnect] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [hasEnhancedPlugin, setHasEnhancedPlugin] = useState(false);
    const navigate = useNavigate();

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

    // Detect Jellyfin Enhanced plugin
    useEffect(() => {
        const detectEnhanced = async () => {
            try {
                const res = await fetch(`${jellyfinService.api.basePath}/Plugins`, {
                    headers: { 'X-Emby-Authorization': jellyfinService.api.authHeader },
                });
                if (res.ok) {
                    const plugins = await res.json();
                    const found = plugins.some(p =>
                        p.Name?.toLowerCase().includes('enhanced') ||
                        p.Name?.toLowerCase().includes('random button')
                    );
                    setHasEnhancedPlugin(found);
                }
            } catch (e) {
                // Plugin detection failed - not critical
            }
        };
        detectEnhanced();
    }, []);

    const isAdmin = user?.Policy?.IsAdministrator;

    return (
        <>
            <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
                <div className="nav-content">
                    {/* Left Section: Logo & Categories */}
                    <div className="nav-start">
                        <div className="nav-logo" onClick={() => navigate('/')}>
                            {config.logoUrl ? (
                                <img src={config.logoUrl} alt={config.appName} />
                            ) : (
                                <img src={getDefaultLogo(config.accentColor)} alt={config.appName} />
                            )}
                        </div>

                        <div className="nav-links primary-links">
                            <span className="nav-link" onClick={() => navigate('/')}>Home</span>
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
                            {config.enableJellyseerr && config.jellyseerrUrl && config.showNavbarRequests !== false && (
                                <>
                                    <span className="nav-divider" />
                                    <a
                                        href={config.jellyseerrUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="nav-link"
                                    >
                                        Requests
                                    </a>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Section: Actions */}
                    <div className="nav-end">
                        <div className="nav-actions">
                            <button className="nav-icon-btn" onClick={() => setShowSearch(true)} title="Search">
                                <span className="material-icons">search</span>
                            </button>

                            <button className="nav-icon-btn" onClick={() => navigate('/favorites')} title="Watchlist">
                                <span className="material-icons">bookmark_border</span>
                            </button>

                            {/* Random button (Jellyfin Enhanced) */}
                            {hasEnhancedPlugin && (
                                <button className="nav-icon-btn" onClick={() => { window.location.href = '/web/index.html#!/randomitems'; }} title="Random">
                                    <span className="material-icons">shuffle</span>
                                </button>
                            )}

                            {/* User Profile & Menu */}
                            <div
                                className={`nav-avatar-container ${showMenu ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            >
                                {user ? (
                                    <div className="nav-avatar-wrapper">
                                        <img
                                            src={`${jellyfinService.api.basePath}/Users/${user.Id}/Images/Primary?quality=90`}
                                            alt={user.Name}
                                            className="nav-avatar"
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
                                                        src={`${jellyfinService.api.basePath}/Users/${user.Id}/Images/Primary?quality=90`}
                                                        alt={user.Name}
                                                        className="menu-avatar"
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
                                        <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html#!/remotecontrol'; }}>
                                            <span className="material-icons">cast</span> Cast to Device
                                        </button>
                                        <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html#!/syncplay'; }}>
                                            <span className="material-icons">sync</span> SyncPlay
                                        </button>
                                        <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html#!/playback'; }}>
                                            <span className="material-icons">play_circle</span> Player
                                        </button>
                                        {hasEnhancedPlugin && (
                                            <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html#!/randomitems'; }}>
                                                <span className="material-icons">shuffle</span> Random
                                            </button>
                                        )}

                                        {/* Administration (admin only) */}
                                        {isAdmin && (
                                            <>
                                                <div className="dropdown-divider"></div>
                                                <div className="menu-section-label">Administration</div>
                                                <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html#!/dashboard'; }}>
                                                    <span className="material-icons">dashboard</span> Dashboard
                                                </button>
                                            </>
                                        )}

                                        {/* Preferences */}
                                        <div className="dropdown-divider"></div>
                                        <div className="menu-section-label">Preferences</div>
                                        <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html#!/mypreferencesmenu'; }}>
                                            <span className="material-icons">settings</span> Settings
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
                                        <button onClick={() => { setShowMenu(false); setShowQuickConnect(true); }}>
                                            <span className="material-icons">qr_code</span> Quick Connect
                                        </button>
                                        <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html#!/selectserver'; }}>
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

            <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
            <LegitFlixSettingsModal isOpen={showLegitSettings} onClose={() => setShowLegitSettings(false)} />
            <QuickConnectModal isOpen={showQuickConnect} onClose={() => setShowQuickConnect(false)} />
            <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} user={user} />
        </>
    );
};

export default Navbar;
