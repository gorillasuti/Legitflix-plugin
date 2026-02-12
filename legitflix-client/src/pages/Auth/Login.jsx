import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import { Button } from '../../components/ui/button';
import { useTheme, getDefaultLogo } from '../../context/ThemeContext';
import './Auth.css';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { config } = useTheme();
    const prefilledUsername = location.state?.username || '';

    const [username, setUsername] = useState(prefilledUsername);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Quick Connect State
    const [isQuickConnect, setIsQuickConnect] = useState(false);
    const [qcCode, setQcCode] = useState('');
    const [qcSecret, setQcSecret] = useState('');

    useEffect(() => {
        let pollInterval;

        const startQuickConnect = async () => {
            try {
                setLoading(true);
                const result = await jellyfinService.initiateQuickConnect();
                setQcCode(result.Code);
                setQcSecret(result.Secret);
                setLoading(false);

                // Start Polling
                pollInterval = setInterval(async () => {
                    if (!result.Secret) return;
                    try {
                        const user = await jellyfinService.checkQuickConnectStatus(result.Secret);
                        if (user) {
                            clearInterval(pollInterval);
                            navigate('/');
                        }
                    } catch (e) {
                        console.warn("Polling error", e);
                    }
                }, 2000);

            } catch (err) {
                console.error("Quick Connect Init Failed", err);
                setError("Failed to initialize Quick Connect.");
                setLoading(false);
            }
        };

        if (isQuickConnect) {
            startQuickConnect();
        } else {
            setQcCode('');
            setQcSecret('');
            if (pollInterval) clearInterval(pollInterval);
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [isQuickConnect, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await jellyfinService.authenticateUser(username, password);
            // Verify login success by trying to get current user
            const user = await jellyfinService.getCurrentUser();
            if (user) {
                navigate('/');
            } else {
                setError('Login succeeded but failed to retrieve user session.');
            }
        } catch (err) {
            console.error("Login error", err);
            setError('Invalid username or password.');
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
                    <p>{isQuickConnect ? 'Quick Connect' : 'Sign In'}</p>
                </div>

                {isQuickConnect ? (
                    <div className="qc-container">
                        {loading ? (
                            <div className="qc-spinner"></div>
                        ) : (
                            <>
                                <div className="qc-instructions">
                                    Use your mobile device to scan the code or enter it manually.
                                </div>
                                <div className="qc-code-display">
                                    {qcCode}
                                </div>
                                <div className="qc-instructions">
                                    Waiting for authorization...
                                </div>
                                <div className="qc-spinner"></div>
                            </>
                        )}
                        <button type="button" className="text-link" onClick={() => setIsQuickConnect(false)}>
                            Cancel
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label>Username</label>
                            <input
                                type="text"
                                className="auth-input"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                            />
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <input
                                type="password"
                                className="auth-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                            />
                        </div>

                        {error && <div className="auth-error">{error}</div>}

                        <div className="auth-btn-group">
                            <Button type="submit" variant="ringHover" size="lg" disabled={loading} className="w-full">
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Button>

                            <Button type="button" variant="outline" size="lg" onClick={() => setIsQuickConnect(true)} className="w-full">
                                Quick Connect
                            </Button>
                        </div>

                        <button type="button" className="text-link" onClick={() => navigate('/login/select-user')}>
                            Back to Users
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
