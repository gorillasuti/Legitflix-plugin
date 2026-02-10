import React, { useState, useEffect } from 'react';
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
    const [accentColor, setAccentColor] = useState('#ff7e00');
    const [logoUrl, setLogoUrl] = useState('');
    const [customHex, setCustomHex] = useState('');

    useEffect(() => {
        if (isOpen) {
            const storedColor = localStorage.getItem('LegitFlix_AccentColor') || '#ff7e00';
            const storedLogo = localStorage.getItem('LegitFlix_LogoUrl') || '';
            setAccentColor(storedColor);
            setLogoUrl(storedLogo);
            if (!PRESET_COLORS.some(c => c.value === storedColor)) {
                setCustomHex(storedColor);
            }
        }
    }, [isOpen]);

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
        localStorage.setItem('LegitFlix_AccentColor', accentColor);
        localStorage.setItem('LegitFlix_LogoUrl', logoUrl);

        // Apply immediately
        document.documentElement.style.setProperty('--clr-accent', accentColor);
        const r = parseInt(accentColor.slice(1, 3), 16);
        const g = parseInt(accentColor.slice(3, 5), 16);
        const b = parseInt(accentColor.slice(5, 7), 16);
        document.documentElement.style.setProperty('--clr-accent-glow', `rgba(${r}, ${g}, ${b}, 0.5)`);

        // Trigger event for Navbar logo update if needed, 
        // or just rely on page reload if simple state update isn't enough.
        // For logo, we might need a context or window event. Use window event for simplicity.
        window.dispatchEvent(new Event('legitflix-settings-changed'));

        onClose();
    };

    const handleReset = () => {
        setAccentColor('#ff7e00');
        setLogoUrl('');
        setCustomHex('');
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
