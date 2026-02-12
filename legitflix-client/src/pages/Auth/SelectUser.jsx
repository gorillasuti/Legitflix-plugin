import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jellyfinService } from '../../services/jellyfin';
import { Button } from '../../components/ui/button';
import './Auth.css';

const SelectUser = () => {
    const navigate = useNavigate();
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
                    <h1>LegitFlix</h1>
                    <p>Who's watching?</p>
                </div>

                {loading ? (
                    <div>Loading users...</div>
                ) : (
                    <>
                        <div className="user-grid">
                            {users.map(user => (
                                <button
                                    key={user.Id}
                                    className="user-card"
                                    onClick={() => handleUserSelect(user)}
                                >
                                    {user.PrimaryImageTag ? (
                                        <img
                                            src={jellyfinService.getImageUrl(user, 'Primary', { maxWidth: 200 })}
                                            alt={user.Name}
                                            className="user-avatar-placeholder" // Re-using class for shape
                                            style={{ objectFit: 'cover', padding: 0 }}
                                        />
                                    ) : (
                                        <div className="user-avatar-placeholder">
                                            <span className="material-icons">person</span>
                                        </div>
                                    )}
                                    <span className="user-card-name">{user.Name}</span>
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <Button variant="outline" onClick={handleManual} className="w-full">
                                Manual Login
                            </Button>
                            <button className="text-link" onClick={handleChangeServer}>
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
