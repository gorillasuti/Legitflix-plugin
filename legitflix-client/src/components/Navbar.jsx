
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { jellyfinService } from '../services/jellyfin';
import SettingsModal from './SettingsModal';
import './Navbar.css';

const Navbar = () => {
    const { config } = useTheme();
    const [isScrolled, setIsScrolled] = useState(false);
    const [user, setUser] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showMenu, setShowMenu] = useState(false); // For 3-dot dropdown
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

                    <ul className="nav-links">
                        <li><NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>Home</NavLink></li>
                        <li><NavLink to="/movies" className={({ isActive }) => isActive ? 'active' : ''}>Movies</NavLink></li>
                        <li><NavLink to="/series" className={({ isActive }) => isActive ? 'active' : ''}>Series</NavLink></li>
                        <li><NavLink to="/favorites" className={({ isActive }) => isActive ? 'active' : ''}>My List</NavLink></li>
                    </ul>
                </div>

                <div className="nav-right">
                    <button className="nav-icon-btn" title="Search">
                        <span className="material-icons">search</span>
                    </button>

                    <button className="nav-icon-btn" title="Notifications">
                        <span className="material-icons">notifications</span>
                    </button>

                    <div className="nav-item nav-profile">
                        {user && (
                            <img
                                src={`${jellyfinService.api.basePath}/Users/${user.Id}/Images/Primary?quality=90`}
                                alt={user.Name}
                                className="nav-avatar"
                            />
                        )}
                        <span className="nav-caret"></span>
                    </div>

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
                                <button onClick={() => setShowSettings(true)}>
                                    <span className="material-icons">settings</span> Settings
                                </button>
                                <button onClick={() => window.location.reload()}>
                                    <span className="material-icons">refresh</span> Reload
                                </button>
                                <div className="menu-divider"></div>
                                <button className="logout-btn">
                                    <span className="material-icons">logout</span> Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </nav>

            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </>
    );
};

export default Navbar;
