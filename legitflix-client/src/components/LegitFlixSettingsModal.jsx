import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import './LegitFlixSettingsModal.css';

const PRESET_COLORS = [
    { name: 'Orange', value: '#ff7e00' },
    { name: 'Blue', value: '#00aaff' },
    { name: 'Pink', value: '#ff00aa' },
    { name: 'Green', value: '#00ff7e' },
    { name: 'Red', value: '#ff3333' },
    { name: 'Purple', value: '#aa00ff' },
];

const LegitFlixSettingsModal = ({ isOpen, onClose }) => {
    const { config, updateConfig } = useTheme();
    const [accentColor, setAccentColor] = useState(config.accentColor || '#ff7e00');
    const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');
    const [showCategories, setShowCategories] = useState(config.showNavbarCategories !== false);
    const [customHex, setCustomHex] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAccentColor(config.accentColor || '#ff7e00');
            setLogoUrl(config.logoUrl || '');
            setShowCategories(config.showNavbarCategories !== false);
            if (!PRESET_COLORS.some(c => c.value === config.accentColor)) {
                setCustomHex(config.accentColor);
            }
        }
    }, [isOpen, config]);

    const handleColorChange = (color) => {
        setAccentColor(color);
        setCustomHex('');
    };

    const handleCustomHexChange = (e) => {
        const val = e.target.value;
        setCustomHex(val);
        if (/^#[0-9A-F]{6}$/i.test(val)) {
            setAccentColor(val);
        }
    };

    const handleSave = () => {
        updateConfig({
            accentColor,
            logoUrl,
            logoType: logoUrl ? 'image' : 'text',
            showNavbarCategories: showCategories
        });
        onClose();
    };

    const handleReset = () => {
        setAccentColor('#ff7e00');
        setLogoUrl('');
        setCustomHex('');
        setShowCategories(true);
    };

    if (!isOpen) return null;

    return (
        <div className="legit-settings-overlay" onClick={onClose}>
            <div className="legit-settings-modal" onClick={e => e.stopPropagation()}>
                <div className="legit-settings-header">
                    <h2>LegitFlix Settings</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="legit-settings-body">
                    <div className="setting-section">
                        <h3>Accent Color</h3>
                        <div className="color-presets">
                            {PRESET_COLORS.map(c => (
                                <div
                                    key={c.value}
                                    className={`color-preset ${accentColor === c.value ? 'selected' : ''}`}
                                    style={{ backgroundColor: c.value }}
                                    onClick={() => handleColorChange(c.value)}
                                    title={c.name}
                                >
                                    {accentColor === c.value && <span className="material-icons">check</span>}
                                </div>
                            ))}
                        </div>
                        <div className="custom-color-input">
                            <label>Custom Hex:</label>
                            <input
                                type="text"
                                placeholder="#RRGGBB"
                                value={customHex}
                                onChange={handleCustomHexChange}
                                maxLength={7}
                            />
                            <div className="color-preview" style={{ backgroundColor: accentColor }}></div>
                        </div>
                    </div>

                    <div className="setting-section">
                        <h3>Custom Logo URL</h3>
                        <p className="setting-desc">Enter a direct URL to an image to replace the top-left logo.</p>
                        <input
                            type="text"
                            className="legit-input"
                            placeholder="https://example.com/logo.png"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                        />
                    </div>

                    <div className="setting-section">
                        <div className="setting-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Show Categories in Navbar</h3>
                                <p className="setting-desc" style={{ marginBottom: 0 }}>Display library links in the top navigation bar</p>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={showCategories}
                                    onChange={(e) => setShowCategories(e.target.checked)}
                                />
                                <span className="slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="legit-settings-footer">
                    <button className="btn-reset" onClick={handleReset}>Reset Defaults</button>
                    <button className="btn-save" onClick={handleSave}>Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default LegitFlixSettingsModal;
