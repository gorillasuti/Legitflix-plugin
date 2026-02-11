
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { jellyfinService } from '../services/jellyfin';
import SearchModal from './SearchModal/SearchModal';
import LegitFlixSettingsModal from './LegitFlixSettingsModal';
import './Navbar.css';

const Navbar = () => {
    const { config } = useTheme();
    const [user, setUser] = useState(null);
    const [libraries, setLibraries] = useState([]);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showLegitSettings, setShowLegitSettings] = useState(false);
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


    return (
        <>
            <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
                <div className="nav-content">
                    {/* Left Section: Logo & Primary Links */}
                    <div className="nav-start">
                        <div className="nav-logo" onClick={() => navigate('/')}>
                            {config.logoType === 'image' && config.logoUrl ? (
                                <img src={config.logoUrl} alt={config.appName} />
                            ) : (
                                <span className="logo-text">{config.appName}</span>
                            )}
                        </div>
                        <div className="nav-links primary-links">
                            <span className="nav-link" onClick={() => navigate('/')}>Home</span>
                            <span className="nav-link">New</span>
                            <span className="nav-link">Popular</span>
                            <span className="nav-link">Simulcast</span>
                        </div>
                    </div>

                    {/* Right Section: Secondary Links & Actions */}
                    <div className="nav-end">
                        {/* Browse / Categories Dropdown */}
                        {config.showNavbarCategories && libraries.length > 0 && (
                            <div className="nav-item-dropdown">
                                <span className="nav-link dropdown-trigger">
                                    Browse <span className="material-icons">expand_more</span>
                                </span>
                                <div className="dropdown-content">
                                    {libraries.map(lib => (
                                        <div
                                            key={lib.Id}
                                            className="dropdown-item"
                                            onClick={() => navigate(`/library/${lib.Id}`)}
                                        >
                                            {lib.Name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Interactive conditional links */}
                        {config.enableJellyseerr && config.jellyseerrUrl && (
                            <a
                                href={config.jellyseerrUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="nav-link secondary-link"
                            >
                                Requests
                            </a>
                        )}

                        <div className="nav-actions">
                            <button className="nav-icon-btn" onClick={() => setShowSearch(true)} title="Search">
                                <span className="material-icons">search</span>
                            </button>

                            <button className="nav-icon-btn" onClick={() => navigate('/favorites')} title="Watchlist">
                                <span className="material-icons">bookmark_border</span>
                            </button>

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
                                            <div className="user-menu-header" onClick={() => { setShowMenu(false); navigate('/profile'); }}>
                                                <div className="header-avatar-container">
                                                    <img
                                                        src={`${jellyfinService.api.basePath}/Users/${user.Id}/Images/Primary?quality=90`}
                                                        alt={user.Name}
                                                        className="menu-avatar"
                                                    />
                                                </div>
                                                <div className="user-menu-info">
                                                    <span className="user-name">{user.Name}</span>
                                                    <span className="user-status">Premium Member</span>
                                                </div>
                                                <span className="material-icons edit-icon">edit</span>
                                            </div>
                                        )}

                                        <div className="dropdown-divider"></div>

                                        <button onClick={() => { setShowMenu(false); navigate('/profile'); }}>
                                            <span className="material-icons">switch_account</span> Switch Profile
                                        </button>
                                        <button onClick={() => { setShowMenu(false); navigate('/profile'); }}>
                                            <span className="material-icons">settings</span> Settings
                                        </button>
                                        <button onClick={() => { setShowMenu(false); setShowLegitSettings(true); }}>
                                            <span className="material-icons">palette</span> Theme Settings
                                        </button>
                                        {user && user.Policy && user.Policy.IsAdministrator && (
                                            <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html#!/dashboard'; }}>
                                                <span className="material-icons">dashboard</span> Dashboard
                                            </button>
                                        )}
                                        <button onClick={() => { setShowMenu(false); navigate('/history'); }}>
                                            <span className="material-icons">history</span> History
                                        </button>

                                        <div className="dropdown-divider"></div>

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
        </>
    );
};

export default Navbar;
