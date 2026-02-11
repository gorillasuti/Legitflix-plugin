import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jellyfinService from '../../services/jellyfin';
import Navbar from '../../components/Navbar';

const ItemRedirect = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    useEffect(() => {
        const resolveItem = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                if (!user) {
                    // If not logged in, we might need to wait or redirect to login. 
                    // Ideally AuthGuard handles this, but let's be safe.
                    return;
                }

                const item = await jellyfinService.getItem(user.Id, id);

                if (!item) {
                    setError('Item not found');
                    return;
                }

                console.log('[LegitFlix] Resolved item type:', item.Type);

                switch (item.Type) {
                    case 'Series':
                        navigate(`/series/${item.Id}`, { replace: true });
                        break;
                    case 'Movie':
                        navigate(`/movie/${item.Id}`, { replace: true });
                        break;
                    case 'Season':
                    case 'Episode':
                        if (item.SeriesId) {
                            navigate(`/series/${item.SeriesId}`, { replace: true });
                        } else {
                            // Fallback if no SeriesId (e.g. special cases)
                            window.location.href = `/?classic=true#!/details?id=${item.Id}`;
                        }
                        break;
                    default:
                        // Fallback to classic UI for unsupported types (Music, BoxSet, etc.)
                        console.log('[LegitFlix] Unsupported item type, falling back to classic:', item.Type);
                        window.location.href = `/?classic=true#!/details?id=${item.Id}`;
                        break;
                }

            } catch (err) {
                console.error('Failed to resolve item:', err);
                setError('Failed to resolve item link.');
                // Fallback to classic on error?
                setTimeout(() => {
                    window.location.href = `/?classic=true#!/details?id=${id}`;
                }, 2000);
            }
        };

        if (id) {
            resolveItem();
        }
    }, [id, navigate]);

    return (
        <div style={{ minHeight: '100vh', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <Navbar />
            <div style={{ marginTop: 100 }}>
                {error ? (
                    <div>
                        <h2>{error}</h2>
                        <p>Redirecting to classic view...</p>
                    </div>
                ) : (
                    <h2>Opening content...</h2>
                )}
            </div>
        </div>
    );
};

export default ItemRedirect;
