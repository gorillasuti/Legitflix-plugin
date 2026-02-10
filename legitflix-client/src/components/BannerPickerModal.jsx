
import React, { useState, useEffect } from 'react';
import { jellyfinService } from '../services/jellyfin';
import './BannerPickerModal.css';

const BannerPickerModal = ({ isOpen, onClose, onSave, userId }) => {
    const [items, setItems] = useState([]);
    const [selectedUrl, setSelectedUrl] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !userId) return;
        setLoading(true);
        setSelectedUrl(null);

        const fetchBackdrops = async () => {
            try {
                const data = await jellyfinService.getAllBackdrops(userId, 50);
                setItems(data);
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
        return `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?quality=80&maxWidth=600`;
    };

    const getFullBackdropUrl = (item) => {
        return `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?quality=90&maxWidth=1920`;
    };

    const handleSave = () => {
        if (selectedUrl) {
            onSave(selectedUrl);
        }
        onClose();
    };

    return (
        <div className="banner-picker-overlay">
            <div className="banner-picker-backdrop" onClick={onClose}></div>
            <div className="banner-picker-modal">
                <h2 className="banner-picker-title">Select Banner</h2>

                {loading ? (
                    <div className="banner-picker-loading">
                        <span className="material-icons spinning">refresh</span>
                        <span>Loading backdrops...</span>
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
                )}

                <div className="banner-picker-actions">
                    <button className="btn-picker-close" onClick={onClose}>CLOSE</button>
                    <button
                        className="btn-picker-save"
                        onClick={handleSave}
                        disabled={!selectedUrl}
                    >
                        <span className="material-icons">save</span> SAVE
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BannerPickerModal;
