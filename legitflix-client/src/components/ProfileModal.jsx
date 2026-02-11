import React, { useState, useRef } from 'react';
import { jellyfinService } from '../services/jellyfin';
import BannerPickerModal from './BannerPickerModal';
import './ProfileModal.css';

const ProfileModal = ({ isOpen, onClose, user }) => {
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');
    const [showBannerPicker, setShowBannerPicker] = useState(false);
    const avatarInputRef = useRef(null);

    // Calculate Banner URL for display
    const currentBannerUrl = user ? (localStorage.getItem(`LegitFlix_Banner_${user.Id}`) ||
        (user.ImageTags?.Banner ? `${jellyfinService.api.basePath}/Users/${user.Id}/Images/Banner?tag=${user.ImageTags.Banner}&quality=90`
            : (user.BackdropImageTags?.[0] ? `${jellyfinService.api.basePath}/Users/${user.Id}/Images/Backdrop/0?tag=${user.BackdropImageTags[0]}&quality=90` : ''))) : '';

    const handleBannerSave = (url) => {
        if (user) {
            localStorage.setItem(`LegitFlix_Banner_${user.Id}`, url);
            // Force refresh is handled by the user refreshing manually for now, or we could lift state.
        }
    };


    if (!isOpen || !user) return null;

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setStatus('');

        try {
            const res = await fetch(
                `${jellyfinService.api.basePath}/Users/${user.Id}/Images/Primary`,
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
                setStatus('Profile image updated! Refresh to see changes.');
            } else {
                setStatus('Failed to upload image. Please try again.');
            }
        } catch (err) {
            setStatus('Upload failed. Check your connection.');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAvatar = async () => {
        setUploading(true);
        setStatus('');
        try {
            const res = await fetch(
                `${jellyfinService.api.basePath}/Users/${user.Id}/Images/Primary`,
                {
                    method: 'DELETE',
                    headers: {
                        'X-Emby-Authorization': jellyfinService.api.authHeader,
                    },
                }
            );
            if (res.ok) {
                setStatus('Profile image removed.');
            } else {
                setStatus('Failed to remove image.');
            }
        } catch (err) {
            setStatus('Action failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="pm-overlay" onClick={onClose}>
            <div className="pm-modal" onClick={e => e.stopPropagation()}>
                <div className="pm-header">
                    <h2>Edit Profile</h2>
                    <button className="pm-close" onClick={onClose}>&times;</button>
                </div>

                <div className="pm-body">
                    {/* Banner Section */}
                    <div className="pm-avatar-section" style={{ marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
                        <div className="pm-avatar-preview" style={{ width: '160px', height: '90px', borderRadius: '8px' }}>
                            {currentBannerUrl ? (
                                <img
                                    src={currentBannerUrl}
                                    alt="Banner"
                                    className="pm-avatar-img"
                                    style={{ borderRadius: '8px', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{ width: '100%', height: '100%', background: '#333', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span className="material-icons" style={{ fontSize: '32px', opacity: 0.5 }}>image</span>
                                </div>
                            )}
                        </div>
                        <div className="pm-avatar-info">
                            <h3>Profile Banner</h3>
                            <p>Customize your profile background</p>
                            <div className="pm-avatar-actions">
                                <button
                                    className="pm-btn pm-btn-accent"
                                    onClick={() => setShowBannerPicker(true)}
                                >
                                    <span className="material-icons">wallpaper</span>
                                    Change Banner
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Avatar Section */}
                    <div className="pm-avatar-section">
                        <div className="pm-avatar-preview">
                            <img
                                src={`${jellyfinService.api.basePath}/Users/${user.Id}/Images/Primary?quality=90&t=${Date.now()}`}
                                alt={user.Name}
                                className="pm-avatar-img"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className="pm-avatar-overlay" onClick={() => avatarInputRef.current?.click()}>
                                <span className="material-icons">photo_camera</span>
                            </div>
                        </div>
                        <div className="pm-avatar-info">
                            <h3>{user.Name}</h3>
                            <p>{user?.Policy?.IsAdministrator ? 'Administrator' : 'User'}</p>
                            <div className="pm-avatar-actions">
                                <button
                                    className="pm-btn pm-btn-accent"
                                    onClick={() => avatarInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    <span className="material-icons">upload</span>
                                    Upload Photo
                                </button>
                                <button
                                    className="pm-btn pm-btn-outline"
                                    onClick={handleDeleteAvatar}
                                    disabled={uploading}
                                >
                                    <span className="material-icons">delete</span>
                                    Remove
                                </button>
                            </div>
                        </div>
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleAvatarUpload}
                        />
                    </div>

                    {status && <p className="pm-status">{status}</p>}
                </div>
            </div>
            <BannerPickerModal
                isOpen={showBannerPicker}
                onClose={() => setShowBannerPicker(false)}
                onSave={(url) => {
                    handleBannerSave(url);
                    setShowBannerPicker(false);
                }}
                userId={user?.Id}
            />
        </div>
    );
};

export default ProfileModal;
