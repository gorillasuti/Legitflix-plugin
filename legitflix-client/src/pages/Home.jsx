import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroCarousel from '../components/HeroCarousel';
import JellyseerrCard from '../components/JellyseerrCard';
import { jellyfinService } from '../services/jellyfin';
import './Home.css';

const Home = () => {
    const [libraries, setLibraries] = useState([]);
    const [resumeItems, setResumeItems] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLibraries = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                if (user) {
                    const res = await jellyfinService.getUserViews(user.Id);
                    setLibraries(res.data.Items || []);

                    const resume = await jellyfinService.getResumeItems(user.Id);
                    setResumeItems(resume.data.Items || []);
                }
            } catch (e) {
                console.error("Failed to fetch data", e);
            }
        };
        fetchLibraries();
    }, []);

    return (
        <div className="home-page">
            <HeroCarousel />

            <div className="home-content-container">
                {resumeItems.length > 0 && (
                    <section className="home-section">
                        <h2 className="section-title">Continue Watching</h2>
                        <div className="libraries-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                            {resumeItems.map(item => (
                                <div
                                    key={item.Id}
                                    className="library-card"
                                    onClick={() => navigate(`/series/${item.SeriesId || item.Id}`)}
                                    title={item.Name}
                                >
                                    <div className="library-card-content" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <div style={{ width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '8px', marginBottom: '8px' }}>
                                            <img
                                                src={`${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?fillHeight=180&fillWidth=320&quality=90`}
                                                alt={item.Name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                        </div>
                                        <span className="library-name" style={{ fontSize: '0.9rem' }}>{item.SeriesName || item.Name}</span>
                                        <span className="library-name" style={{ fontSize: '0.8rem', opacity: 0.7 }}>{item.Name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section className="home-section">
                    <h2 className="section-title">My Media</h2>
                    <div className="libraries-grid">
                        {libraries.map(lib => (
                            <div
                                key={lib.Id}
                                className="library-card"
                                onClick={() => {/* Navigate to library */ }}
                            >
                                <div className="library-card-content">
                                    <span className="material-icons library-icon">
                                        {lib.CollectionType === 'movies' ? 'movie' :
                                            lib.CollectionType === 'tvshows' ? 'tv' : 'folder'}
                                    </span>
                                    <span className="library-name">{lib.Name}</span>
                                </div>
                            </div>
                        ))}
                        <JellyseerrCard />
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Home;
