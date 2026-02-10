import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import Navbar from '../../components/Navbar';
import './Profile.css';

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('details');
    const [bannerUrl, setBannerUrl] = useState('');

    useEffect(() => {
        const loadUser = async () => {
            const u = await jellyfinService.getCurrentUser();
            if (u) {
                setUser(u);

                // Banner Logic (Local > Item Banner > Item Backdrop)
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

    const handleBannerChange = () => {
        // Placeholder for real upload/select logic
        const newUrl = prompt("Enter a URL for your profile banner (or leave empty to reset):", bannerUrl);
        if (newUrl !== null) {
            if (newUrl) {
                localStorage.setItem(`LegitFlix_Banner_${user.Id}`, newUrl);
                setBannerUrl(newUrl);
            } else {
                localStorage.removeItem(`LegitFlix_Banner_${user.Id}`);
                setBannerUrl(''); // Should fall back to default logic on reload, or we re-run it
                // Re-running fetch logic for simplify
                window.location.reload();
            }
        }
    };

    const handleLogout = async () => {
        // Simple logout for now - clear token and redirect
        // Ideally use jellyfinService.logout() if it existed
        console.log("Logging out...");
        // Clear auth (simplified, assumes local storage logic in service)
        // For now, redirect to login path or reload if auth is handled globally
        // Assuming jellyfin-apiclient handles storage
        navigate('/'); // Redirect home, assuming auth guard will catch it? 
        // Or if simple plugin:
        window.location.reload();
    };

    if (!user) return <div className="profile-loading">Loading Profile...</div>;

    const avatarUrl = user.PrimaryImageTag
        ? `${jellyfinService.api.basePath}/Users/${user.Id}/Images/Primary?tag=${user.PrimaryImageTag}&quality=90`
        : 'https://raw.githubusercontent.com/google/material-design-icons/master/png/action/account_circle/materialicons/48dp/2x/baseline_account_circle_white_48dp.png';

    const renderContent = () => {
        switch (activeTab) {
            case 'details':
                return (
                    <div className="profile-section-card">
                        <h3 className="profile-section-title">User Information</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <label>Username</label>
                                <div className="info-value">{user.Name}</div>
                            </div>
                            <div className="info-item">
                                <label>User ID</label>
                                <div className="info-value" style={{ fontSize: '0.8rem', opacity: 0.7 }}>{user.Id}</div>
                            </div>
                            <div className="info-item">
                                <label>Last Login</label>
                                <div className="info-value">{new Date(user.LastLoginDate).toLocaleDateString()}</div>
                            </div>
                            <div className="info-item">
                                <label>Administrator</label>
                                <div className="info-value">{user.Policy?.IsAdministrator ? 'Yes' : 'No'}</div>
                            </div>
                        </div>
                    </div>
                );
            case 'display':
                return (
                    <div className="profile-section-card">
                        <h3 className="profile-section-title">Display Settings</h3>
                        <p style={{ color: '#999' }}>Settings are managed via the main Jellyfin configuration for now. Theme overrides can be toggled here in the future.</p>

                        <div style={{ marginTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #333' }}>
                                <span>Enable Gaming Profile Theme</span>
                                <label className="toggle-switch">
                                    <input type="checkbox" defaultChecked={true} />
                                    <span className="slider"></span>
                                </label>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #333' }}>
                                <span>Blur Navbar on Scroll</span>
                                <label className="toggle-switch">
                                    <input type="checkbox" defaultChecked={true} />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                );
            default:
                return <div className="profile-section-card"><p>Section under construction.</p></div>;
        }
    };

    return (
        <div className="profile-page">
            <Navbar />

            <div className="gaming-profile-header">
                <h1 className="profile-page-title">Account Settings</h1>

                {/* TABS */}
                <div className="profile-nav-tabs">
                    <button
                        className={`profile-tab ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        My details
                    </button>
                    <button
                        className={`profile-tab ${activeTab === 'display' ? 'active' : ''}`}
                        onClick={() => setActiveTab('display')}
                    >
                        Display
                    </button>
                    <button
                        className={`profile-tab ${activeTab === 'home' ? 'active' : ''}`}
                        onClick={() => setActiveTab('home')}
                    >
                        Home Screen
                    </button>
                    <button
                        className={`profile-tab ${activeTab === 'playback' ? 'active' : ''}`}
                        onClick={() => setActiveTab('playback')}
                    >
                        Playback
                    </button>

                    <button className="profile-tab logout-tab" onClick={handleLogout}>
                        <span className="material-icons">exit_to_app</span> Sign Out
                    </button>
                </div>

                {/* BANNER */}
                <div
                    className={`profile-banner ${bannerUrl ? 'has-banner' : ''}`}
                    style={bannerUrl ? { backgroundImage: `url('${bannerUrl}')` } : {}}
                >
                    <div className="banner-overlay"></div>
                    <div className="banner-add-btn" onClick={handleBannerChange}>
                        <span className="material-icons-outlined">
                            {bannerUrl ? 'edit' : 'add_photo_alternate'}
                        </span>
                        <span className="banner-add-text">
                            {bannerUrl ? 'Change profile banner' : 'Add profile banner'}
                        </span>
                    </div>
                </div>

                {/* AVATAR */}
                <div className="profile-avatar-container">
                    <div className="profile-avatar" style={{ backgroundImage: `url('${avatarUrl}')` }}></div>
                    <div className="avatar-edit-icon" onClick={() => alert("Avatar uploading handled by Jellyfin. Please use the main dashboard to change your avatar for now.")}>
                        <span className="material-icons-outlined">mode_edit</span>
                    </div>
                </div>
            </div>

            {/* CONTENT */}
            <div className="profile-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default Profile;
