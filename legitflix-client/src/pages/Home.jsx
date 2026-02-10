import React, { useState, useEffect } from 'react';
import HeroCarousel from '../components/HeroCarousel';
import JellyseerrCard from '../components/JellyseerrCard';
import { jellyfinService } from '../services/jellyfin';
import './Home.css';

const Home = () => {
    const [libraries, setLibraries] = useState([]);

    useEffect(() => {
        const fetchLibraries = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                if (user) {
                    const res = await jellyfinService.getUserViews(user.Id);
                    setLibraries(res.data.Items || []);
                }
            } catch (e) {
                console.error("Failed to fetch libraries", e);
            }
        };
        fetchLibraries();
    }, []);

    return (
        <div className="home-page">
            <HeroCarousel />

            <div className="home-content-container">
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

                {/* Additional sections like Next Up, Latest can go here later */}
            </div>
        </div>
    );
};

export default Home;
