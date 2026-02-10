
import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import './InfoModal.css'; // Reusing modal styles
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose }) => {
    const { config, updateConfig } = useTheme();
    const [logoUrlInput, setLogoUrlInput] = useState(config.logoUrl || '');
    const [logoType, setLogoType] = useState(config.logoType);

    if (!isOpen) return null;

    const handleSave = () => {
        updateConfig({
            logoType,
            logoUrl: logoUrlInput,
        });
        onClose();
    };

    const handleReset = () => {
        setLogoType('text');
        setLogoUrlInput('');
        updateConfig({ // Also save reset immediately or just update state? Let's update state only first.
            logoType: 'text',
            logoUrl: ''
        });
    };

    return (
        <div className="legitflix-info-modal visible settings-modal-overlay">
            <div className="info-modal-backdrop" onClick={onClose}></div>

            <div className="info-modal-content settings-modal-content">
                <button className="btn-close-modal" onClick={onClose}>
                    <span className="material-icons">close</span>
                </button>

                <div className="settings-header">
                    <h2>Plugin Settings</h2>
                </div>

                <div className="settings-body">
                    <section className="settings-section">
                        <h3>Branding</h3>

                        <div className="form-group">
                            <label>Logo Type</label>
                            <div className="radio-group">
                                <label>
                                    <input
                                        type="radio"
                                        name="logoType"
                                        checked={logoType === 'text'}
                                        onChange={() => setLogoType('text')}
                                    /> Text
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="logoType"
                                        checked={logoType === 'image'}
                                        onChange={() => setLogoType('image')}
                                    /> Image URL
                                </label>
                            </div>
                        </div>

                        {logoType === 'image' && (
                            <div className="form-group">
                                <label>Logo URL</label>
                                <input
                                    type="text"
                                    className="settings-input"
                                    value={logoUrlInput}
                                    onChange={(e) => setLogoUrlInput(e.target.value)}
                                    placeholder="https://example.com/logo.png"
                                />
                                <p className="help-text">Direct link to a PNG/SVG image with transparent background.</p>
                            </div>
                        )}
                    </section>

                    <div className="settings-actions">
                        <button className="btn-secondary" onClick={handleReset}>Reset to Defaults</button>
                        <button className="btn-primary" onClick={handleSave}>Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
