import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import SubtitleModal from '../../components/SubtitleModal';
import SkeletonLoader from '../../components/SkeletonLoader';
import { Button } from '@/components/ui/button';
import './MovieDetail.css';
import jellyfinService from '../../services/jellyfin';

const MovieDetail = () => {
    const { id } = useParams();
    const [movie, setMovie] = useState(null);
    const [similar, setSimilar] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubtitleModalOpen, setIsSubtitleModalOpen] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const user = await jellyfinService.getCurrentUser();
                if (!user) return;

                // 1. Fetch Movie Details
                const movieData = await jellyfinService.getItem(user.Id, id);
                setMovie(movieData);

                // 2. Fetch Similar Items
                const similarData = await jellyfinService.getSimilarItems(user.Id, id);
                setSimilar(similarData.Items || []);

            } catch (error) {
                console.error("Failed to load movie data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [id]);

    if (loading) {
        return (
            <div className="lf-movie-container">
                <Navbar />
                <div style={{ position: 'relative', height: '80vh', backgroundColor: '#141414', overflow: 'hidden' }}>
                    <SkeletonLoader width="100%" height="100%" />
                    <div className="lf-movie-hero__content">
                        <div style={{ width: '300px', height: '450px', flexShrink: 0 }}>
                            <SkeletonLoader width="100%" height="100%" style={{ borderRadius: '12px' }} />
                        </div>
                        <div className="lf-movie-hero__info" style={{ marginLeft: '40px', flex: 1 }}>
                            <SkeletonLoader width="60%" height="60px" style={{ marginBottom: '20px' }} />
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
                                <SkeletonLoader width="60px" height="24px" />
                                <SkeletonLoader width="40px" height="24px" />
                                <SkeletonLoader width="80px" height="24px" />
                            </div>
                            <SkeletonLoader width="100%" height="20px" style={{ marginBottom: '10px' }} />
                            <SkeletonLoader width="90%" height="20px" style={{ marginBottom: '10px' }} />
                            <SkeletonLoader width="95%" height="20px" style={{ marginBottom: '30px' }} />
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <SkeletonLoader width="150px" height="50px" style={{ borderRadius: '30px' }} />
                                <SkeletonLoader width="150px" height="50px" style={{ borderRadius: '30px' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    if (!movie) return <div className="lf-movie-container" style={{ color: 'white', padding: '100px', textAlign: 'center' }}>Movie not found</div>;

    const backdropUrl = jellyfinService.getImageUrl(movie, 'Backdrop');
    const logoUrl = movie.ImageTags && movie.ImageTags.Logo ? jellyfinService.getImageUrl(movie, 'Logo') : null;
    const posterUrl = jellyfinService.getImageUrl(movie, 'Primary');

    // Cast processing: Take top 15
    const cast = movie.People ? movie.People.filter(p => p.Type === 'Actor').slice(0, 15) : [];

    const handleToggleFavorite = async () => {
        try {
            const newStatus = !movie.UserData?.IsFavorite;
            await jellyfinService.markFavorite(jellyfinService.getCurrentUser().then(u => u.Id), movie.Id, newStatus);
            setMovie(prev => ({ ...prev, UserData: { ...prev.UserData, IsFavorite: newStatus } }));
        } catch (error) {
            console.error("Failed to toggle favorite", error);
        }
    };

    const handleTogglePlayed = async () => {
        try {
            const newStatus = !movie.UserData?.Played;
            const user = await jellyfinService.getCurrentUser(); // properly await user
            await jellyfinService.markPlayed(user.Id, movie.Id, newStatus);
            setMovie(prev => ({ ...prev, UserData: { ...prev.UserData, Played: newStatus } }));
        } catch (error) {
            console.error("Failed to toggle played", error);
        }
    };

    // Format duration
    const formatDuration = (ticks) => {
        if (!ticks) return '';
        const minutes = Math.floor(ticks / 600000000);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${minutes}m`;
    };

    return (
        <div className="lf-movie-container">
            <Navbar />

            {/* HERO SECTION */}
            <section className="lf-movie-hero" id="lfMovieHero">
                <div className="lf-movie-hero__backdrop" style={{ backgroundImage: `url('${backdropUrl}')` }}></div>
                <div className="lf-movie-hero__backdrop" style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, #141414 0%, rgba(20,20,20,0.85) 25%, rgba(20,20,20,0.4) 60%, transparent 100%)',
                    zIndex: 1
                }}></div>

                <div className="lf-movie-hero__content">
                    <img className="lf-movie-hero__poster" src={posterUrl} alt={movie.Name} />

                    <div className="lf-movie-hero__info">
                        {logoUrl ?
                            <img src={logoUrl} alt={movie.Name} className="lf-movie-hero__logo" style={{ opacity: 1, position: 'relative', bottom: 'auto', left: 'auto' }} />
                            : <h1 className="lf-movie-hero__title">{movie.Name}</h1>
                        }

                        <div className="lf-movie-hero__meta">
                            <span>{movie.ProductionYear}</span>
                            <span>•</span>
                            <span>{movie.OfficialRating}</span>
                            <span>•</span>
                            <span>{formatDuration(movie.RunTimeTicks)}</span>
                            <span>•</span>
                            <div className="lf-movie-hero__rating">
                                <span className="material-icons">star</span>
                                <span>{movie.CommunityRating ? movie.CommunityRating.toFixed(1) : ''}</span>
                            </div>
                        </div>

                        <div className="lf-movie-hero__details">
                            <div className="lf-movie-hero__description">
                                <p className="lf-movie-hero__description-text">{movie.Overview}</p>

                                <div className="lf-movie-hero__cast-info" style={{ marginTop: '20px' }}>
                                    {cast.length > 0 && (
                                        <div style={{ marginBottom: 5 }}>
                                            <strong>Starring: </strong>
                                            {cast.slice(0, 3).map(p => p.Name).join(', ')}
                                        </div>
                                    )}
                                    {movie.Genres && (
                                        <div>
                                            <strong>Genres: </strong>
                                            {movie.Genres.join(', ')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="lf-movie-hero__actions" style={{ marginTop: 20, display: 'flex', gap: '10px' }}>
                            <Button
                                variant="ringHover"
                                size="lg"
                                className="h-12 px-8 text-lg font-bold rounded-md gap-2"
                            >
                                <span className="material-icons">play_arrow</span>
                                Watch Now
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                className="h-12 px-6 text-lg rounded-md gap-2 border-2 bg-white/5 border-white/20 hover:bg-white/10 hover:border-white text-white"
                            >
                                <span className="material-icons">theaters</span>
                                Trailer
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className={`h-12 w-12 rounded-md border-2 bg-white/5 border-white/20 hover:bg-white/10 hover:border-white ${movie.UserData?.IsFavorite ? 'text-primary border-primary' : 'text-white'}`}
                                onClick={handleToggleFavorite}
                            >
                                <span className="material-icons">{movie.UserData?.IsFavorite ? 'favorite' : 'favorite_border'}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* PLAYER SECTION (Direct Player Placeholder) */}
            <div className="lf-content-section" id="lfDirectPlayer">
                <div className="lf-section-header">
                    <h2 className="lf-section-title">{movie.Name}</h2>
                    <div className="lf-filter-controls flex gap-3">
                        <Button
                            variant="outline"
                            className="gap-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                            onClick={() => setIsSubtitleModalOpen(true)}
                        >
                            <span className="material-icons">subtitles</span>
                            <span>Audio & Subs</span>
                            <span className="material-icons">expand_more</span>
                        </Button>
                        <Button
                            variant="outline"
                            className={`gap-2 border-white/20 bg-transparent hover:bg-white/10 ${movie.UserData?.Played ? 'text-primary border-primary/50' : 'text-white'}`}
                            onClick={handleTogglePlayed}
                        >
                            <span className="material-icons">{movie.UserData?.Played ? 'check_circle' : 'check_circle_outline'}</span>
                            <span>{movie.UserData?.Played ? 'Played' : 'Mark Played'}</span>
                        </Button>
                    </div>
                </div>

                <div className="lf-player-wrapper">
                    <div className="lf-player-placeholder">
                        <span className="material-icons" style={{ fontSize: '64px', opacity: 0.5 }}>play_circle_outline</span>
                        <p style={{ marginTop: '10px', fontWeight: 500 }}>Click Play to Start</p>
                    </div>
                </div>
            </div>

            {/* CAST SECTION */}
            {cast.length > 0 && (
                <div className="lf-content-section">
                    <div className="lf-section-divider"></div>
                    <div className="lf-section-header" style={{ marginTop: 30 }}>
                        <h2 className="lf-section-title">Cast & Crew</h2>
                    </div>
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

            {/* MORE LIKE THIS SECTION */}
            {similar.length > 0 && (
                <div className="lf-content-section">
                    <div className="lf-section-divider"></div>
                    <div className="lf-section-header" style={{ marginTop: 30 }}>
                        <h2 className="lf-section-title">More Like This</h2>
                    </div>
                    <div className="lf-similar-grid">
                        {similar.map(item => (
                            <div key={item.Id} className="lf-similar-card" onClick={() => window.location.href = `/movie/${item.Id}`}>
                                <img
                                    src={jellyfinService.getImageUrl(item, 'Primary')}
                                    alt={item.Name}
                                    className="lf-similar-card__poster"
                                    loading="lazy"
                                />
                                <div className="lf-similar-card__title">{item.Name}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <SubtitleModal
                isOpen={isSubtitleModalOpen}
                onClose={() => setIsSubtitleModalOpen(false)}
                seriesId={movie.Id}
                initialSeasonId={null} // Movies don't have seasons/episodes in the same way
                initialEpisodeId={movie.Id} // For movies, element ID is the playable item
                isMovie={true}
            />
        </div>
    );
};

export default MovieDetail;
