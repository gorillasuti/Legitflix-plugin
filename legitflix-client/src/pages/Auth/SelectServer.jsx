import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import { Button } from '../../components/ui/button';
import Navbar from '../../components/Navbar';
import { useTheme, getDefaultLogo } from '../../context/ThemeContext';
import './Auth.css';

const SelectServer = () => {
    const navigate = useNavigate();
    const { config } = useTheme();
    const [url, setUrl] = useState(window.location.origin); // Default to current origin
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await jellyfinService.validateServer(url);
            if (res && res.valid) {
                // Re-init service with new base URL
                jellyfinService.jellyfin.configuration.basePath = res.baseUrl;
                navigate('/login/select-user');
            } else {
                setError('Could not connect to server. Please check the URL.');
            }
        } catch (e) {
            console.error("Validation error", e);
            setError('An error occurred while connecting.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-logo">
                    {config.logoUrl ? (
                        <img src={config.logoUrl} alt="LegitFlix" className="auth-logo-img" />
                    ) : (
                        <img src={getDefaultLogo(config.accentColor)} alt="LegitFlix" className="auth-logo-img" />
                    )}
                    <p>Connect to Server</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>Server URL</label>
                        <input
                            type="text"
                            className="auth-input"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="http://myserver:8096"
                        />
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <Button type="submit" variant="ringHover" size="lg" disabled={loading} className="w-full">
                        {loading ? 'Connecting...' : 'Connect'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default SelectServer;
