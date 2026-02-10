
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroCarousel from '../components/HeroCarousel';
import MediaRow from '../components/MediaRow';
import InfoModal from '../components/InfoModal';
import JellyseerrCard from '../components/JellyseerrCard';
import Navbar from '../components/Navbar';
import { jellyfinService } from '../services/jellyfin';
import './Home.css';

const Home = () => {
    const [libraries, setLibraries] = useState([]);
    const [resumeItems, setResumeItems] = useState([]);
    const [modalItem, setModalItem] = useState(null); // ID of item to show in modal
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLibraries = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                if (user) {
                    const res = await jellyfinService.getUserViews(user.Id);
                    setLibraries(res.Items || []);

                    const resume = await jellyfinService.getResumeItems(user.Id);
                    setResumeItems(resume.Items || []);
                }
            } catch (e) {
                console.error("Failed to fetch data", e);
            }
        };
        fetchLibraries();
    }, []);

    const openModal = (id) => {
        setModalItem(id);
    };

    const closeModal = () => {
        setModalItem(null);
    };

    return (
        <div className="home-page">
            <Navbar />
            <HeroCarousel onInfoClick={openModal} />

            <div className="home-content-container" style={{ marginTop: '-150px', position: 'relative', zIndex: 10 }}>
                {/* 1. Continue Watching (Legacy) - Keeping as a Row? Or Grid?  */}
                {/* For now, let's keep it consistent, maybe simple grid is fine, or change to Row if desired */}
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
                                        <div style={{ width: '100%', background: '#333', height: '4px', borderRadius: '2px', marginTop: '4px' }}>
                                            <div style={{
                                                width: `${(item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100}%`,
                                                background: '#E50914',
                                                height: '100%'
                                            }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* 2. Media Rows (Latest per Library) */}
                {libraries.map(lib => (
                    <MediaRow
                        key={lib.Id}
                        title={`Latest ${lib.Name}`}
                        libraryId={lib.Id}
                        onCardClick={(item) => openModal(item.Id)}
                    />
                ))}

                {/* 3. Jellyseerr & Library Navigation */}
                <section className="home-section">
                    <h2 className="section-title">Browse Libraries</h2>
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

            {/* INFO MODAL */}
            <InfoModal
                itemId={modalItem}
                isOpen={!!modalItem}
                onClose={closeModal}
            />
        </div>
    );
};

export default Home;
