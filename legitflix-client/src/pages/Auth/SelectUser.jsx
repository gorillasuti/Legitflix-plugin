import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import { Button } from '../../components/ui/button';
import SkeletonLoader from '../../components/SkeletonLoader';
import { useTheme, getDefaultLogo } from '../../context/ThemeContext';
import './Auth.css';

const SelectUser = () => {
    const navigate = useNavigate();
    const { config } = useTheme();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const publicUsers = await jellyfinService.getPublicUsers();
                if (publicUsers) setUsers(publicUsers);
            } catch (e) {
                console.error("Failed to load users", e);
            } finally {
                setLoading(false);
            }
        };
        loadUsers();
    }, []);

    const handleUserSelect = (user) => {
        navigate('/login', { state: { username: user.Name, userId: user.Id } });
    };

    const handleManual = () => {
        navigate('/login');
    };

    const handleChangeServer = () => {
        navigate('/login/select-server');
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-logo">
                    {config.logoUrl ? (
                        <img src={config.logoUrl} alt={config.appName} className="auth-logo-img" />
                    ) : (
                        <img src={getDefaultLogo(config.accentColor)} alt={config.appName} className="auth-logo-img" />
                    )}
                    <p>Who's watching?</p>
                </div>

                {loading ? (
                    <div className="user-grid">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="user-card" style={{ cursor: 'default' }}>
                                <div className="user-avatar-container" style={{ border: 'none', padding: 0 }}>
                                    <SkeletonLoader type="circle" width="100px" height="100px" />
                                </div>
                                <SkeletonLoader type="text" width="80px" height="20px" style={{ marginTop: '10px' }} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="user-grid">
                            {users.map(user => (
                                <button
                                    key={user.Id}
                                    className="user-card"
                                    onClick={() => handleUserSelect(user)}
                                >
                                    <div className="user-avatar-container">
                                        <div className="auth-avatar-wrapper">
                                            <img
                                                src={`${jellyfinService.api.basePath || ''}/Users/${user.Id}/Images/Primary?quality=90`}
                                                alt={user.Name}
                                                className="auth-avatar"
                                                onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.nextSibling.style.display = 'flex'; }}
                                            />
                                        </div>
                                        <div className="user-avatar-placeholder" style={{ display: 'none' }}>
                                            <span className="material-icons">person</span>
                                        </div>
                                    </div>
                                    <span className="user-card-name">{user.Name}</span>
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                            <button className="text-link" onClick={handleManual}>
                                Manual Login
                            </button>
                            <button className="text-link" style={{ fontSize: '0.8rem', opacity: 0.7 }} onClick={handleChangeServer}>
                                Switch Server
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SelectUser;
