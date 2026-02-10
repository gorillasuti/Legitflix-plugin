
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroCarousel from '../../components/HeroCarousel';
import MediaRow from '../../components/MediaRow';
import InfoModal from '../../components/InfoModal';
import JellyseerrCard from '../../components/JellyseerrCard';
import Navbar from '../../components/Navbar';
import { jellyfinService } from '../../services/jellyfin';
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
                {/* 1. Continue Watching */}
                {resumeItems.length > 0 && (
                    <section className="home-section" style={{ paddingLeft: '4%', paddingRight: '4%', marginBottom: '40px' }}>
                        <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>Continue Watching</h2>
                        <div className="resume-scroll-container" style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                            {resumeItems.map(item => (
                                <div
                                    key={item.Id}
                                    className="library-card" // Using generic card class
                                    onClick={() => navigate(`/details/${item.Id}`)} // Navigate to details
                                    title={item.Name}
                                    style={{ flex: '0 0 280px', cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                                >
                                    <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                                        <img
                                            src={`${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?fillHeight=157&fillWidth=280&quality=90`}
                                            alt={item.Name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        <div className="play-overlay-center" style={{
                                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                                            width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)',
                                            border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8
                                        }}>
                                            <span className="material-icons" style={{ fontSize: '24px' }}>play_arrow</span>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '8px' }}>
                                        <div style={{ width: '100%', background: '#333', height: '3px', borderRadius: '2px', marginBottom: '5px' }}>
                                            <div style={{
                                                width: `${Math.min(100, (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100)}%`,
                                                background: '#ff7e00', // Orange progress
                                                height: '100%'
                                            }}></div>
                                        </div>
                                        <span style={{ fontSize: '0.9rem', color: '#ddd', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.SeriesName || item.Name}
                                        </span>
                                        {item.SeriesName && <span style={{ fontSize: '0.8rem', color: '#888' }}>{item.Name}</span>}
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
