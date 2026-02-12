import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import { Button } from '../../components/ui/button';
import './Auth.css';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const prefilledUsername = location.state?.username || '';

    const [username, setUsername] = useState(prefilledUsername);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
                    <h1>LegitFlix</h1>
                    <p>Sign In</p>
                </div>

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

                    <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>

                    <button type="button" className="text-link" onClick={() => navigate('/login/select-user')}>
                        Back to Users
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
