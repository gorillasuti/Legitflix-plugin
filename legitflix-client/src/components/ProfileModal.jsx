import React, { useState, useRef } from 'react';
import { jellyfinService } from '../services/jellyfin';
import BannerPickerModal from './BannerPickerModal';
import AvatarPickerModal from './AvatarPickerModal';
import './ProfileModal.css';

const ProfileModal = ({ isOpen, onClose, user }) => {
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');
    const [showBannerPicker, setShowBannerPicker] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const avatarInputRef = useRef(null);

    // Calculate Banner URL for display
    // We prioritize the user's actual banner from the API.
    const currentBannerUrl = user ? (
        user.ImageTags?.Banner ? `${jellyfinService.api.basePath}/Users/${user.Id}/Images/Banner?tag=${user.ImageTags.Banner}&quality=90` :
            (user.BackdropImageTags?.[0] ? `${jellyfinService.api.basePath}/Users/${user.Id}/Images/Backdrop/0?tag=${user.BackdropImageTags[0]}&quality=90` : '')
    ) : '';

    const handleBannerSave = async (url) => {
        if (!user || !url) return;

        setStatus('Updating banner...');
        setUploading(true);

        try {
            // Fetch blob from local/remote URL
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to download selected banner");

            const blob = await response.blob();
            if (blob.size === 0) throw new Error("Downloaded banner is empty");

            // Optional: Delete existing banner first to be safe
            try { await jellyfinService.deleteUserImage(user.Id, 'Banner'); } catch (e) { /* ignore */ }

            // Use service to upload
            await jellyfinService.uploadUserImage(user.Id, 'Banner', blob);

            setStatus('Banner updated! Reloading...');
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            console.error('Banner upload error:', err);
            setStatus('Banner upload failed.');
        } finally {
            setUploading(false);
        }
    };


    if (!isOpen || !user) return null;

    const handleAvatarFile = async (file) => {
        if (!file) return;

        setUploading(true);
        setStatus('');

        try {
            await jellyfinService.uploadUserImage(user.Id, 'Primary', file);
            setStatus('Profile image updated! Refresh to see changes.');
            setShowAvatarPicker(false);
        } catch (err) {
            console.error(err);
            setStatus('Upload failed. Check your connection.');
        } finally {
            setUploading(false);
        }
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files?.[0];
        handleAvatarFile(file);
    };

    const handleDeleteAvatar = async () => {
        setUploading(true);
        setStatus('');
        try {
            await jellyfinService.deleteUserImage(user.Id, 'Primary');
            setStatus('Profile image removed.');
        } catch (err) {
            console.error(err);
            setStatus('Failed to remove image.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <div className="pm-overlay" onClick={onClose}>
                <div className="pm-modal" onClick={e => e.stopPropagation()}>
                    <button className="pm-close-floating" onClick={onClose}>
                        <span className="material-icons">close</span>
                    </button>

                    {/* Cover Image Section */}
                    <div className="pm-cover">
                        {currentBannerUrl ? (
                            <img
                                src={currentBannerUrl}
                                alt="Banner"
                                className="pm-cover-img"
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span className="material-icons" style={{ fontSize: '48px', opacity: 0.1 }}>wallpaper</span>
                            </div>
                        )}
                        <div className="pm-cover-overlay">
                            <button
                                className="pm-edit-cover-btn"
                                onClick={() => setShowBannerPicker(true)}
                                disabled={uploading}
                            >
                                <span className="material-icons">edit</span>
                                Change Cover
                            </button>
                        </div>
                    </div>

                    {/* Profile Header (Avatar overlap) */}
                    <div className="pm-profile-header">
                        <div className="pm-avatar-container">
                            <img
                                src={`${jellyfinService.api.basePath}/Users/${user.Id}/Images/Primary?quality=90&t=${Date.now()}`}
                                alt={user.Name}
                                className="pm-avatar-img"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <div className="pm-avatar-edit-overlay" onClick={() => setShowAvatarPicker(true)}>
                                <span className="material-icons">photo_camera</span>
                            </div>
                        </div>

                        <div className="pm-user-details">
                            <h2>{user.Name}</h2>
                            <p>
                                <span className="material-icons" style={{ fontSize: '16px' }}>
                                    {user?.Policy?.IsAdministrator ? 'shield' : 'person'}
                                </span>
                                {user?.Policy?.IsAdministrator ? 'Administrator' : 'User'}
                            </p>
                        </div>
                    </div>

                    <div className="pm-divider" />

                    {/* Actions */}
                    <div className="pm-actions">
                        <button
                            className="pm-action-row"
                            onClick={() => avatarInputRef.current?.click()}
                            disabled={uploading}
                        >
                            <span className="material-icons">upload</span>
                            <span>Upload Custom Avatar</span>
                        </button>
                        <button
                            className="pm-action-row danger"
                            onClick={handleDeleteAvatar}
                            disabled={uploading}
                        >
                            <span className="material-icons">delete</span>
                            <span>Remove Avatar</span>
                        </button>
                    </div>

                    {status && <div className="pm-status">{status}</div>}

                    {/* Hidden Input for direct upload */}
                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleAvatarUpload}
                    />
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
            <AvatarPickerModal
                isOpen={showAvatarPicker}
                onClose={() => setShowAvatarPicker(false)}
                onSave={handleAvatarFile}
                userId={user?.Id}
            />
        </>
    );
};

export default ProfileModal;
