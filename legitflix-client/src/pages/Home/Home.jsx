import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroCarousel from '../../components/HeroCarousel';
import MediaRow from '../../components/MediaRow';
import InfoModal from '../../components/InfoModal';
import JellyseerrCard from '../../components/JellyseerrCard';
import Navbar from '../../components/Navbar';
import SkeletonLoader from '../../components/SkeletonLoader';
import { jellyfinService } from '../../services/jellyfin';
import { useTheme } from '../../context/ThemeContext';
import './Home.css';
import { Button } from '../../components/ui/button';

const Home = () => {
    const [libraries, setLibraries] = useState([]);
    const [resumeItems, setResumeItems] = useState([]);
    const [historyItems, setHistoryItems] = useState([]);
    const [promoItems, setPromoItems] = useState([]); // New state for promos
    const [loading, setLoading] = useState(true);
    const [modalItem, setModalItem] = useState(null); // ID of item to show in modal
    const { config } = useTheme(); // Consuming ThemeContext
    const navigate = useNavigate();

    useEffect(() => {
        const fetchLibraries = async () => {
            setLoading(true);
            try {
                const user = await jellyfinService.getCurrentUser();
                if (user) {
                    const res = await jellyfinService.getUserViews(user.Id);
                    setLibraries(res.Items || []);

                    const resume = await jellyfinService.getResumeItems(user.Id);
                    const resumeList = resume.Items || [];
                    setResumeItems(resumeList);

                    // History (recently played, completed items)
                    const history = await jellyfinService.getHistoryItems(user.Id, 12);
                    const historyList = (history.Items || []).filter(i => !resumeList.some(r => r.Id === i.Id));
                    setHistoryItems(historyList);

                    // --- Promo Logic (Ported from legacy theme) ---
                    // 1. Get Candidates (Latest Movies/Series)
                    const candidatesFn = async () => {
                        return jellyfinService.getItems(user.Id, {
                            limit: 20,
                            recursive: true,
                            includeItemTypes: ['Movie', 'Series'],
                            sortBy: ['DateCreated'],
                            sortOrder: ['Descending'],
                            imageTypeLimit: 1,
                            enableImageTypes: ['Primary', 'Backdrop', 'Thumb', 'Logo'],
                            fields: ['Overview', 'ProductionYear', 'ImageTags']
                        });
                    };

                    const candidatesRes = await candidatesFn();
                    const candidates = candidatesRes.Items || [];

                    // 2. Filter out Resume items (and maybe Next Up if we had it, but Resume is main one)
                    // LEGACY PARITY: Do NOT filter out Resume items for Promo. 
                    // Promo should be the absolute latest items added to the server.
                    // const resumeIds = new Set(resumeList.map(i => i.Id));
                    // const filtered = candidates.filter(i => !resumeIds.has(i.Id));

                    // 3. Take Top 3
                    setPromoItems(candidates.slice(0, 3));
                }
            } catch (e) {
                console.error("Failed to fetch data", e);
            } finally {
                setLoading(false);
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

            <div className="home-content-container" style={{ position: 'relative', zIndex: 10 }}>
                {loading ? (
                    <div style={{ padding: '0 4.2%', marginTop: '40px' }}>
                        {/* Browse Libraries Row */}
                        <SkeletonLoader width="180px" height="24px" style={{ marginBottom: '20px' }} />
                        <div style={{ display: 'flex', gap: '15px', overflow: 'hidden', marginBottom: '50px' }}>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} style={{ flex: '0 0 160px' }}>
                                    <SkeletonLoader width="100%" height="240px" style={{ borderRadius: '8px' }} />
                                </div>
                            ))}
                        </div>

                        {/* Continue Watching Row */}
                        <SkeletonLoader width="220px" height="24px" style={{ marginBottom: '20px' }} />
                        <div style={{ display: 'flex', gap: '15px', overflow: 'hidden', marginBottom: '50px' }}>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} style={{ flex: '0 0 280px' }}>
                                    <SkeletonLoader width="100%" height="157px" style={{ borderRadius: '4px', marginBottom: '8px' }} />
                                    <SkeletonLoader width="70%" height="14px" style={{ marginBottom: '4px' }} />
                                    <SkeletonLoader width="40%" height="12px" />
                                </div>
                            ))}
                        </div>

                        {/* Promo Section */}
                        <div style={{ marginBottom: '50px' }}>
                            <SkeletonLoader width="100%" height="300px" style={{ borderRadius: '12px', marginBottom: '15px' }} />
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <SkeletonLoader width="50%" height="180px" style={{ borderRadius: '12px' }} />
                                <SkeletonLoader width="50%" height="180px" style={{ borderRadius: '12px' }} />
                            </div>
                        </div>

                        {/* Latest Media Row */}
                        <SkeletonLoader width="180px" height="24px" style={{ marginBottom: '20px' }} />
                        <div style={{ display: 'flex', gap: '15px', overflow: 'hidden' }}>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} style={{ flex: '0 0 220px' }}>
                                    <SkeletonLoader width="100%" height="330px" style={{ borderRadius: '4px' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 1. Jellyseerr & Library Navigation */}
                        <section className="home-section" style={{ paddingLeft: '4%', paddingRight: '4%', marginBottom: '40px' }}>
                            <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>Browse Libraries</h2>
                            <div className="libraries-grid">
                                {libraries.map(lib => (
                                    <div
                                        key={lib.Id}
                                        className="library-card"
                                        onClick={() => navigate(`/library/${lib.Id}`)} // Assuming consistent with Navbar
                                    >
                                        <img
                                            src={`${jellyfinService.api.basePath}/Items/${lib.Id}/Images/Primary?fillHeight=480&fillWidth=320&quality=90`}
                                            alt={lib.Name}
                                            className="library-card-image"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex'; // Show fallback if image fails
                                            }}
                                        />
                                        <div className="library-card-content fallback" style={{ display: 'none' }}>
                                            <span className="material-icons library-icon">
                                                {lib.CollectionType === 'movies' ? 'movie' :
                                                    lib.CollectionType === 'tvshows' ? 'tv' : 'folder'}
                                            </span>
                                        </div>
                                        {config.showLibraryTitles && (
                                            <div className="library-card-overlay">
                                                <span className="library-name">{lib.Name}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <JellyseerrCard />
                            </div>
                        </section>

                        {/* 2. Continue Watching */}
                        {resumeItems.length > 0 && (
                            <section className="home-section" style={{ paddingLeft: '4%', paddingRight: '4%', marginBottom: '40px' }}>
                                <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>Continue Watching</h2>
                                <div className="backdrop-scroll-container">
                                    {resumeItems.map(item => (
                                        <div
                                            key={item.Id}
                                            className="backdrop-card"
                                            onClick={() => navigate(`/details/${item.Id}`)}
                                            title={item.Name}
                                        >
                                            <div className="backdrop-card-image">
                                                <img
                                                    src={`${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?maxWidth=500&quality=90`}
                                                    alt={item.Name}
                                                    onError={(e) => { e.target.src = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?maxWidth=500`; }}
                                                />
                                            </div>
                                            {/* Progress Bar */}
                                            {item.UserData && item.RunTimeTicks > 0 && (
                                                <div className="backdrop-progress-track">
                                                    <div className="backdrop-progress-fill" style={{ width: `${Math.min(100, (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100)}%` }}></div>
                                                </div>
                                            )}
                                            <div className="backdrop-card-info">
                                                <span className="backdrop-card-title">{item.SeriesName || item.Name}</span>
                                                {item.SeriesName && (
                                                    <span className="backdrop-card-subtitle">
                                                        {item.ParentIndexNumber != null && item.IndexNumber != null
                                                            ? `S${item.ParentIndexNumber}:E${item.IndexNumber} - ${item.Name}`
                                                            : item.Name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* 2.5. History */}
                        {historyItems.length > 0 && (
                            <section className="home-section" style={{ paddingLeft: '4%', paddingRight: '4%', marginBottom: '40px' }}>
                                <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>History ›</h2>
                                <div className="backdrop-scroll-container">
                                    {historyItems.map(item => (
                                        <div
                                            key={item.Id}
                                            className="backdrop-card"
                                            onClick={() => navigate(`/details/${item.Id}`)}
                                            title={item.Name}
                                        >
                                            <div className="backdrop-card-image">
                                                <img
                                                    src={`${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?maxWidth=500&quality=90`}
                                                    alt={item.Name}
                                                    onError={(e) => { e.target.src = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?maxWidth=500`; }}
                                                />
                                            </div>
                                            <div className="backdrop-card-info">
                                                <span className="backdrop-card-title">{item.SeriesName || item.Name}</span>
                                                {item.SeriesName && (
                                                    <span className="backdrop-card-subtitle">
                                                        {item.ParentIndexNumber != null && item.IndexNumber != null
                                                            ? `S${item.ParentIndexNumber}:E${item.IndexNumber} - ${item.Name}`
                                                            : item.Name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Promo Banners */}
                        {promoItems.length > 0 && (
                            <section className="home-section" style={{ paddingLeft: '4%', paddingRight: '4%', marginBottom: '50px' }}>
                                <div className="promo2-wrapper">
                                    {/* ── Hero Banner (Item 1) ── */}
                                    <div className="promo2-hero" onClick={() => openModal(promoItems[0].Id)}>
                                        <img
                                            src={`${jellyfinService.api.basePath}/Items/${promoItems[0].Id}/Images/Backdrop/0?maxWidth=1400&quality=90`}
                                            className="promo2-hero-img"
                                            alt={promoItems[0].Name}
                                        />
                                        <div className="promo2-hero-gradient" />
                                        <div className="promo2-hero-content">
                                            {promoItems[0].ImageTags?.Logo ? (
                                                <img
                                                    src={`${jellyfinService.api.basePath}/Items/${promoItems[0].Id}/Images/Logo/0?maxWidth=350&quality=90`}
                                                    className="promo2-hero-logo"
                                                    alt={promoItems[0].Name}
                                                />
                                            ) : (
                                                <h2 className="promo2-hero-title">{promoItems[0].Name}</h2>
                                            )}
                                            {promoItems[0].Overview && (
                                                <p className="promo2-hero-desc">{promoItems[0].Overview}</p>
                                            )}
                                            <Button
                                                variant="ringHover"
                                                size="lg"
                                                onClick={(e) => { e.stopPropagation(); navigate(`/details/${promoItems[0].Id}`); }}
                                            >
                                                WATCH NOW
                                            </Button>
                                        </div>
                                    </div>

                                    {/* ── Two Small Cards (Items 2 & 3) ── */}
                                    {(promoItems[1] || promoItems[2]) && (
                                        <div className="promo2-row">
                                            {promoItems.slice(1, 3).map(item => (
                                                <div key={item.Id} className="promo2-card" onClick={() => openModal(item.Id)}>
                                                    <div className="promo2-card-text">
                                                        <h3 className="promo2-card-title">{item.Name}</h3>
                                                        <span className="promo2-card-year">{item.ProductionYear}</span>
                                                        <p className="promo2-card-desc">{item.Overview}</p>
                                                        <Button
                                                            variant="ringHover"
                                                            className="promo2-start-btn"
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/details/${item.Id}`); }}
                                                        >
                                                            START WATCHING
                                                        </Button>
                                                    </div>
                                                    <div className="promo2-card-img">
                                                        <img
                                                            src={`${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?maxWidth=500&quality=90`}
                                                            alt={item.Name}
                                                            onError={(e) => { e.target.src = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?maxWidth=400`; }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* 3. Media Rows (Latest per Library) */}
                        {libraries.map(lib => (
                            <MediaRow
                                key={lib.Id}
                                title={`Latest ${lib.Name}`}
                                libraryId={lib.Id}
                                onCardClick={(item) => openModal(item.Id)}
                            />
                        ))}
                    </>
                )}
            </div>

            <InfoModal
                itemId={modalItem}
                isOpen={!!modalItem}
                onClose={closeModal}
            />
        </div>
    );
};

export default Home;
