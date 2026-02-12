import React, { useState, useEffect } from 'react';
import './AvatarPickerModal.css';
import avatarManifest from '../config/avatars.json';

const AvatarPickerModal = ({ isOpen, onClose, onSave, userId }) => {
    const [selectedCategory, setSelectedCategory] = useState(Object.keys(avatarManifest)[0]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedCategory(Object.keys(avatarManifest)[0]);
            setSelectedImage(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const categories = Object.keys(avatarManifest);
    const images = avatarManifest[selectedCategory] || [];

    const handleSave = async () => {
        if (!selectedImage) return;
        setLoading(true);
        try {
            // Converts the relative public URL to a Blob for upload
            const response = await fetch(selectedImage);
            const blob = await response.blob();
            // Create a File object from the blob if needed, or just pass blob
            // Extract extension from URL to match content type
            const ext = selectedImage.split('.').pop().split('?')[0] || 'png';
            const filename = `avatar.${ext}`;
            const file = new File([blob], filename, { type: blob.type });
            await onSave(file);
        } catch (error) {
            console.error("Failed to fetch avatar blob", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="apm-overlay" onClick={onClose}>
            <div className="apm-modal" onClick={e => e.stopPropagation()}>
                <div className="apm-header">
                    <h2>Choose Avatar</h2>
                    <button className="apm-close" onClick={onClose}>&times;</button>
                </div>

                <div className="apm-body">
                    <div className="apm-sidebar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`apm-cat-btn ${selectedCategory === cat ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="apm-content">
                        <div className="apm-grid">
                            {images.map(imgName => {
                                // In production (embedded), we serve from /legitflix/client/
                                // In dev (vite), we serve from /
                                const basePath = import.meta.env.PROD ? '/legitflix/client' : '';
                                const url = `${basePath}/avatars/${selectedCategory}/${imgName}`;
                                return (
                                    <div
                                        key={imgName}
                                        className={`apm-item ${selectedImage === url ? 'selected' : ''}`}
                                        onClick={() => setSelectedImage(url)}
                                    >
                                        <div className="apm-img-wrapper">
                                            <img src={url} alt={imgName} loading="lazy" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="apm-footer">
                    <button className="apm-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
                    <button
                        className="apm-btn-save"
                        onClick={handleSave}
                        disabled={!selectedImage || loading}
                    >
                        {loading ? 'Saving...' : 'Set Avatar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AvatarPickerModal;
