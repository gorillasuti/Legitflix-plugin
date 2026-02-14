
import React, { useState, useEffect } from 'react';
import { jellyfinService } from '../services/jellyfin';
import SkeletonLoader from './SkeletonLoader';
import './BannerPickerModal.css';

const BannerPickerModal = ({ isOpen, onClose, onSave, userId }) => {
    const [mode, setMode] = useState('gallery'); // 'gallery' | 'upload'
    const [items, setItems] = useState([]);
    const [selectedUrl, setSelectedUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!isOpen || !userId) return;

        // Reset state on open
        setMode('gallery');
        setLoading(true);
        setSelectedUrl(null);

        const fetchBackdrops = async () => {
            try {
                const data = await jellyfinService.getAllBackdrops(userId, 50);
                const validItems = data.filter(item => item.BackdropImageTags && item.BackdropImageTags.length > 0);
                setItems(validItems);
            } catch (err) {
                console.error('[BannerPicker] Failed to fetch backdrops', err);
            } finally {
                setLoading(false);
            }
        };
        fetchBackdrops();
    }, [isOpen, userId]);

    if (!isOpen) return null;

    const getBackdropUrl = (item) => {
        const tag = item.BackdropImageTags?.[0];
        const token = jellyfinService.api?.accessToken;
        return `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?quality=80&maxWidth=600&tag=${tag}&api_key=${token}`;
    };

    const getFullBackdropUrl = (item) => {
        const tag = item.BackdropImageTags?.[0];
        const token = jellyfinService.api?.accessToken;
        return `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?quality=90&maxWidth=1920&tag=${tag}&api_key=${token}`;
    };

    const handleSave = () => {
        if (selectedUrl) {
            onSave(selectedUrl);
        }
        onClose();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            // Upload as 'Backdrop' (Cover)
            await jellyfinService.uploadUserImage(userId, 'Backdrop', file);

            // Construct new URL with timestamp to force refresh
            const token = jellyfinService.api?.accessToken;
            // Note: Users endpoint for images
            const newUrl = `${jellyfinService.api.basePath}/Users/${userId}/Images/Backdrop/0?quality=90&maxWidth=1920&tag=${Date.now()}&api_key=${token}`;

            onSave(newUrl);
            onClose();
        } catch (error) {
            console.error("Failed to upload banner", error);
            alert("Failed to upload banner. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="banner-picker-overlay">
            <div className="banner-picker-backdrop" onClick={onClose}></div>
            <div className="banner-picker-modal">
                <div className="banner-picker-header">
                    <h2 className="banner-picker-title">Select Banner</h2>
                    <div className="banner-picker-tabs">
                        <button
                            className={`picker-tab ${mode === 'gallery' ? 'active' : ''}`}
                            onClick={() => setMode('gallery')}
                        >
                            Data Library
                        </button>
                        <button
                            className={`picker-tab ${mode === 'upload' ? 'active' : ''}`}
                            onClick={() => setMode('upload')}
                        >
                            Upload Custom
                        </button>
                    </div>
                </div>

                {mode === 'gallery' ? (
                    loading ? (
                        <div className="banner-picker-grid">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                                <div key={i} className="banner-picker-card">
                                    <SkeletonLoader width="100%" height="100%" style={{ borderRadius: '6px' }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="banner-picker-grid">
                            {items.map((item) => {
                                const thumbUrl = getBackdropUrl(item);
                                const fullUrl = getFullBackdropUrl(item);
                                const isSelected = selectedUrl === fullUrl;
                                return (
                                    <div
                                        key={item.Id}
                                        className={`banner-picker-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => setSelectedUrl(fullUrl)}
                                    >
                                        <img
                                            src={thumbUrl}
                                            alt={item.Name}
                                            loading="lazy"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
                    <div className="banner-upload-container">
                        <div className="upload-box">
                            <span className="material-icons upload-icon">cloud_upload</span>
                            <p>Select an image to use as your profile banner</p>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                disabled={uploading}
                                id="banner-upload-input"
                                className="hidden-input"
                            />
                            <label htmlFor="banner-upload-input" className="btn-upload">
                                {uploading ? 'UPLOADING...' : 'CHOOSE FILE'}
                            </label>
                            <p className="upload-hint">Recommended size: 1920x1080 (JPG/PNG)</p>
                        </div>
                    </div>
                )}

                <div className="banner-picker-actions">
                    <button className="btn-picker-close" onClick={onClose}>CLOSE</button>
                    {mode === 'gallery' && (
                        <button
                            className="btn-picker-save"
                            onClick={handleSave}
                            disabled={!selectedUrl}
                        >
                            <span className="material-icons">save</span> SAVE
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BannerPickerModal;
