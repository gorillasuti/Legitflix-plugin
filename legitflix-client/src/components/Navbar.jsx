
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
            if (!e.target.closest('.nav-menu-container')) {
                setShowMenu(false);
            }
        };
        document.addEventListener('click', closeMenu);
        return () => document.removeEventListener('click', closeMenu);
    }, []);


    return (
        <>
            <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
                <div className="nav-left">
                    <div className="nav-logo" onClick={() => navigate('/')}>
                        {config.logoType === 'image' && config.logoUrl ? (
                            <img src={config.logoUrl} alt={config.appName} />
                        ) : (
                            <span className="logo-text">{config.appName}</span>
                        )}
                    </div>

                    {config.showNavbarCategories && libraries.length > 0 && (
                        <div className="nav-categories">
                            <span className="nav-category-link" onClick={() => navigate('/')}>Home</span>
                            {libraries.map(lib => (
                                <span
                                    key={lib.Id}
                                    className="nav-category-link"
                                    onClick={() => navigate(`/library/${lib.Id}`)} // Assuming library route exists or needs to be handled
                                >
                                    {lib.Name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="nav-right">
                    <button className="nav-icon-btn" onClick={() => setShowSearch(true)} title="Search">
                        <span className="material-icons">search</span>
                    </button>

                    {/* 3-Dot Menu */}
                    <div className="nav-menu-container">
                        <button
                            className="nav-icon-btn"
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        >
                            <span className="material-icons">more_vert</span>
                        </button>

                        {showMenu && (
                            <div className="nav-dropdown-menu">
                                {/* Search row */}
                                <button onClick={() => { setShowMenu(false); setShowSearch(true); }}>
                                    <span className="material-icons">search</span> Search
                                </button>

                                <button onClick={() => { setShowMenu(false); }}>
                                    <span className="material-icons">cast</span> Cast to Device
                                </button>
                                <button onClick={() => { setShowMenu(false); }}>
                                    <span className="material-icons">sync</span> SyncPlay
                                </button>
                                <button onClick={() => { setShowMenu(false); }}>
                                    <span className="material-icons">play_circle</span> Player
                                </button>
                                <button onClick={() => { setShowMenu(false); window.location.href = '/web/index.html#!/dashboard'; }}>
                                    <span className="material-icons">dashboard</span> Dashboard
                                </button>
                                <div className="dropdown-divider"></div>
                                <button onClick={() => { setShowMenu(false); navigate('/profile'); }}>
                                    <span className="material-icons">settings</span> Settings
                                </button>
                                <button onClick={() => { setShowMenu(false); setShowLegitSettings(true); }}>
                                    <span className="material-icons">palette</span> Legitflix Settings
                                </button>
                                <button onClick={() => {
                                    setShowMenu(false);
                                    localStorage.removeItem('jellyfin_credentials');
                                    window.location.reload();
                                }}>
                                    <span className="material-icons">logout</span> Logout
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="nav-avatar-container" onClick={() => navigate('/profile')}>
                        {user && (
                            <img
                                src={`${jellyfinService.api.basePath}/Users/${user.Id}/Images/Primary?quality=90`}
                                alt={user.Name}
                                className="nav-avatar"
                            />
                        )}
                    </div>
                </div>
            </nav>

            <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
            <LegitFlixSettingsModal isOpen={showLegitSettings} onClose={() => setShowLegitSettings(false)} />
        </>
    );
};

export default Navbar;
