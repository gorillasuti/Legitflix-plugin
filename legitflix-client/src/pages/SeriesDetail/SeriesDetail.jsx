import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import SubtitleModal from '../../components/SubtitleModal';
import './SeriesDetail.css';
import jellyfinService from '../../services/jellyfin';

const SeriesDetail = () => {
    const { id } = useParams();
    const [series, setSeries] = useState(null);
    const [seasons, setSeasons] = useState([]);
    const [episodes, setEpisodes] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSubtitleModalOpen, setIsSubtitleModalOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                if (!user) return; // Handle no user authentication

                // 1. Fetch Series Details (using getSeries for extended fields like People)
                const seriesData = await jellyfinService.getSeries(user.Id, id);
                setSeries(seriesData);

                // 2. Fetch Seasons
                const seasonsData = await jellyfinService.getSeasons(user.Id, id);
                if (seasonsData.Items && seasonsData.Items.length > 0) {
                    setSeasons(seasonsData.Items);
                    // Default to first season
                    setSelectedSeasonId(seasonsData.Items[0].Id);
                }

            } catch (error) {
                console.error("Failed to load series data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    // Fetch episodes when selected season changes
    useEffect(() => {
        const loadEpisodes = async () => {
            if (!series || !selectedSeasonId) return;
            try {
                const user = await jellyfinService.getCurrentUser();
                const episodesData = await jellyfinService.getEpisodes(user.Id, series.Id, selectedSeasonId);
                setEpisodes(episodesData.Items || []);
            } catch (error) {
                console.error("Failed to load episodes", error);
            }
        };
        loadEpisodes();
    }, [selectedSeasonId, series]);


    if (loading) return <div className="lf-series-container" style={{ color: 'white' }}>Loading...</div>;
    if (!series) return <div className="lf-series-container" style={{ color: 'white' }}>Series not found</div>;

    const backdropUrl = jellyfinService.getImageUrl(series, 'Backdrop');
    const logoUrl = series.ImageTags && series.ImageTags.Logo ? jellyfinService.getImageUrl(series, 'Logo') : null;
    const posterUrl = jellyfinService.getImageUrl(series, 'Primary');

    // Cast processing: Take top 10
    const cast = series.People ? series.People.slice(0, 10) : [];

    return (
        <div className="lf-series-container">
            <Navbar />

            {/* Hero Section */}
            <section className="lf-series-hero" id="lfSeriesHero">
                <div className="lf-series-hero__backdrop" style={{ backgroundImage: `url('${backdropUrl}')` }}></div>
                <div className="lf-series-hero__backdrop" style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, #141414 0%, rgba(20,20,20,0.85) 25%, rgba(20,20,20,0.4) 60%, transparent 100%)',
                    zIndex: 1
                }}></div>

                <div className="lf-series-hero__content">
                    <img className="lf-series-hero__poster" src={posterUrl} alt={series.Name} />

                    <div className="lf-series-hero__info">
                        {logoUrl ?
                            <img src={logoUrl} alt={series.Name} className="lf-series-hero__logo" style={{ opacity: 1, position: 'relative', bottom: 'auto', left: 'auto' }} />
                            : <h1 className="lf-series-hero__title">{series.Name}</h1>
                        }

                        <div className="lf-series-hero__meta">
                            <span>{series.ProductionYear}</span>
                            <span>•</span>
                            <span>{series.OfficialRating}</span>
                            <span>•</span>
                            <div className="lf-series-hero__rating">
                                <span className="material-icons">star</span>
                                <span>{series.CommunityRating ? series.CommunityRating.toFixed(1) : ''}</span>
                            </div>
                        </div>

                        <div className="lf-series-hero__details">
                            <div className="lf-series-hero__description">
                                <p className="lf-series-hero__description-text">{series.Overview}</p>

                                {cast.length > 0 && (
                                    <div className="lf-series-hero__cast-info" style={{ marginTop: '20px' }}>
                                        <strong>Starring: </strong>
                                        {cast.slice(0, 3).map(p => p.Name).join(', ')}
                                        {cast.length > 3 && <span>...</span>}
                                        <div style={{ marginTop: 5 }}>
                                            <strong>Genres: </strong>
                                            {series.Genres ? series.Genres.join(', ') : ''}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Play Buttons Placeholder */}
                        <div className="lf-series-hero__actions" style={{ marginTop: 20 }}>
                            <button className="lf-btn lf-btn--primary">
                                <span className="material-icons">play_arrow</span>
                                Watch Now
                            </button>
                            <button className="lf-btn lf-btn--glass" onClick={() => setIsSubtitleModalOpen(true)}>
                                <span className="material-icons">subtitles</span>
                                Subtitles
                            </button>
                        </div>

                    </div>
                </div>
            </section>

            {/* Episodes Section */}
            <div className="lf-content-section">
                <h2 className="lf-section-title">Episodes</h2>
                <div style={{ display: 'flex', gap: 10, margin: '20px 0', overflowX: 'auto', paddingBottom: 10 }}>
                    {seasons.map(s => (
                        <button
                            key={s.Id}
                            onClick={() => setSelectedSeasonId(s.Id)}
                            className={`lf-btn ${selectedSeasonId === s.Id ? 'lf-btn--primary' : 'lf-btn--glass'}`}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            {s.Name}
                        </button>
                    ))}
                </div>

                <div className="lf-episode-grid">
                    {episodes.map(ep => (
                        <div key={ep.Id} className="lf-episode-card" onClick={() => console.log('Play', ep.Id)}>
                            <div className="lf-episode-card__thumbnail">
                                <img src={jellyfinService.getImageUrl(ep, 'Primary')} alt={ep.Name} loading="lazy" />
                                <span className="lf-episode-card__badge">{ep.IndexNumber}</span>
                                <div className="lf-episode-card__play-icon">
                                    <span className="material-icons">play_arrow</span>
                                </div>
                            </div>
                            <div className="lf-episode-card__info">
                                <h3 className="lf-episode-card__title">{ep.Name}</h3>
                                <p className="lf-episode-card__subtitle">{ep.Overview}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Review/Cast Section (Full) */}
            {cast.length > 0 && (
                <div className="lf-content-section" style={{ background: '#191919' }}>
                    <h2 className="lf-section-title">Cast & Crew</h2>
                    <div className="lf-cast-grid">
                        {cast.map(person => (
                            <div key={person.Id || person.Name} className="lf-cast-card">
                                <img
                                    src={jellyfinService.getImageUrl(person, 'Primary') || 'https://via.placeholder.com/80x80?text=?'}
                                    alt={person.Name}
                                    className="lf-cast-card__image"
                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/80x80?text=?' }}
                                />
                                <div className="lf-cast-card__name">{person.Name}</div>
                                <div className="lf-cast-card__role">{person.Role}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <SubtitleModal
                isOpen={isSubtitleModalOpen}
                onClose={() => setIsSubtitleModalOpen(false)}
                seriesId={series ? series.Id : ''}
                initialSeasonId={selectedSeasonId}
                initialEpisodeId={episodes.length > 0 ? episodes[0].Id : ''}
            />
        </div>
    );
};

export default SeriesDetail;
