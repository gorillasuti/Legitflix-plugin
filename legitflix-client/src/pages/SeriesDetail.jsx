import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { jellyfinService } from '../services/jellyfin';
import './SeriesDetail.css';

const SeriesDetail = () => {
    const { id } = useParams();
    const [series, setSeries] = useState(null);
    const [seasons, setSeasons] = useState([]);
    const [episodes, setEpisodes] = useState([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const user = await jellyfinService.getCurrentUser();
                if (user) {
                    const seriesData = await jellyfinService.getSeries(user.Id, id);
                    setSeries(seriesData);

                    const seasonsData = await jellyfinService.getSeasons(user.Id, id);
                    setSeasons(seasonsData.Items || []);

                    if (seasonsData.Items && seasonsData.Items.length > 0) {
                        const firstSeason = seasonsData.Items[0];
                        setSelectedSeasonId(firstSeason.Id);

                        const eps = await jellyfinService.getEpisodes(user.Id, id, firstSeason.Id);
                        setEpisodes(eps.Items || []);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch series details", e);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

    const handleSeasonChange = async (seasonId) => {
        setSelectedSeasonId(seasonId);
        try {
            const user = await jellyfinService.getCurrentUser();
            const eps = await jellyfinService.getEpisodes(user.Id, id, seasonId);
            setEpisodes(eps.Items || []);
        } catch (e) {
            console.error("Failed to fetch episodes", e);
        }
    };

    if (loading) return <div className="p-10 text-white">Loading...</div>;
    if (!series) return <div className="p-10 text-white">Series not found</div>;

    const backdropUrl = series.BackdropImageTags && series.BackdropImageTags.length > 0
        ? `${jellyfinService.api.basePath}/Items/${series.Id}/Images/Backdrop/0?maxWidth=1920&quality=90`
        : '';

    // Fallback: SDK constructs URLs differently perhaps, but we can assume standard Jellyfin URL structure relative to base.
    // Actually, we should check how SDK handles images or use component.
    // For now, manual URL construction is reliable if we know the base.
    // Note: React might need full URL if proxying is weird, but relative usually fine.

    return (
        <div className="lf-series-container">
            {/* HERO */}
            <section className="lf-series-hero">
                <div className="lf-series-hero__backdrop" style={{ backgroundImage: `url('${backdropUrl}')` }}></div>
                <div className="lf-series-hero__content">
                    <img
                        className="lf-series-hero__poster"
                        src={`${jellyfinService.api.basePath}/Items/${series.Id}/Images/Primary?fillHeight=350&fillWidth=240&quality=96`}
                        alt={series.Name}
                    />
                    <div className="lf-series-hero__info">
                        <h1 className="lf-series-hero__title">{series.Name}</h1>
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

                        <div className="lf-series-hero__actions">
                            <button className="lf-btn lf-btn--primary">
                                <span className="material-icons">play_arrow</span>
                                Watch Now
                            </button>
                            <button className="lf-btn lf-btn--glass">
                                <span className="material-icons">favorite_border</span>
                            </button>
                        </div>

                        <div className="lf-series-hero__details">
                            <p className="lf-series-hero__description text-sm max-w-2xl text-gray-300">
                                {series.Overview}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SEASONS & EPISODES */}
            <section className="lf-content-section">
                <div className="lf-episodes-header">
                    <div className="lf-season-selector">
                        <select
                            value={selectedSeasonId || ''}
                            onChange={(e) => handleSeasonChange(e.target.value)}
                        >
                            {seasons.map(season => (
                                <option key={season.Id} value={season.Id}>
                                    {season.Name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="lf-episode-grid">
                    {episodes.map(ep => (
                        <div key={ep.Id} className="lf-episode-card">
                            <div className="lf-episode-card__thumbnail">
                                <img
                                    src={`${jellyfinService.api.basePath}/Items/${ep.Id}/Images/Primary?fillHeight=180&fillWidth=320&quality=90`}
                                    alt={ep.Name}
                                    onError={(e) => e.target.style.display = 'none'}
                                />
                                <div className="lf-episode-card__badge">E{ep.IndexNumber}</div>
                            </div>
                            <div className="lf-episode-card__info">
                                <h3 className="lf-episode-card__title">{ep.IndexNumber}. {ep.Name}</h3>
                                <p className="lf-episode-card__subtitle">{ep.Overview}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default SeriesDetail;
