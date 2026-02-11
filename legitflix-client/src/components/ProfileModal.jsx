import React, { useState, useRef } from 'react';
import { jellyfinService } from '../services/jellyfin';
import './ProfileModal.css';

const ProfileModal = ({ isOpen, onClose, user }) => {
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState('');
    const avatarInputRef = useRef(null);

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
        </div>
    );
};

export default ProfileModal;
