
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { jellyfinService } from '../services/jellyfin';
import SearchModal from './SearchModal/SearchModal';
import './Navbar.css';

const Navbar = () => {
    const { config } = useTheme();
    const [isScrolled, setIsScrolled] = useState(false);
    const [user, setUser] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        const fetchUser = async () => {
            const u = await jellyfinService.getCurrentUser();
            setUser(u);
        };

        window.addEventListener('scroll', handleScroll);
        fetchUser();

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
                                <div className="dropdown-search-row">
                                    <span className="material-icons">search</span>
                                    <span>Search</span>
                                </div>

                                <button onClick={() => { setShowMenu(false); }}>
                                    <span className="material-icons">cast</span> Cast to Device
                                    <span className="dropdown-badge">Search</span>
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
        </>
    );
};

export default Navbar;
