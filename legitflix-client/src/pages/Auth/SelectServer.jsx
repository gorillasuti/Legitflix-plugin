import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import { Button } from '../../components/ui/button';
import Navbar from '../../components/Navbar';
import './Auth.css';

const SelectServer = () => {
    const navigate = useNavigate();
    const [url, setUrl] = useState(window.location.origin); // Default to current origin
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const res = await jellyfinService.validateServer(url);
        if (res.valid) {
            // Re-init service with new base URL
            jellyfinService.jellyfin.configuration.basePath = res.baseUrl;
            // Persist server URL preference if needed, or just pass to next step
            navigate('/login/select-user');
        } else {
            setError('Could not connect to server. Please check the URL.');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-logo">
                    <h1>LegitFlix</h1>
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

                    <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
                        {loading ? 'Connecting...' : 'Connect'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default SelectServer;
