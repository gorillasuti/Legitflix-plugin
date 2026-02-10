import React, { useState, useEffect } from 'react';
import jellyfinService from '../services/jellyfin';
import PropTypes from 'prop-types';

const SubtitleModal = ({ isOpen, onClose, seriesId, initialSeasonId, initialEpisodeId, isMovie = false }) => {
    const [seasons, setSeasons] = useState([]);
    const [episodes, setEpisodes] = useState([]);
    const [selectedSeason, setSelectedSeason] = useState(initialSeasonId || '');
    const [selectedEpisode, setSelectedEpisode] = useState(initialEpisodeId || '');

    const [currentSubtitles, setCurrentSubtitles] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchLanguage, setSearchLanguage] = useState('eng');
    const [loadingSubs, setLoadingSubs] = useState(false);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && seriesId) {
            if (isMovie) {
                // For movies, the "Episode" ID is the Movie ID itself
                setSelectedEpisode(initialEpisodeId || seriesId);
                // Skip loading seasons/episodes
            } else {
                loadSeasons();
            }
        }
    }, [isOpen, seriesId, isMovie]);

    useEffect(() => {
        if (selectedSeason) {
            loadEpisodes(selectedSeason);
        }
    }, [selectedSeason]);

    useEffect(() => {
        if (selectedEpisode) {
            loadCurrentSubtitles();
        }
    }, [selectedEpisode]);

    const loadSeasons = async () => {
        try {
            const user = await jellyfinService.getCurrentUser();
            const data = await jellyfinService.getSeasons(user.Id, seriesId);
            setSeasons(data.Items || []);
            if (!selectedSeason && data.Items.length > 0) {
                setSelectedSeason(data.Items[0].Id);
            }
        } catch (err) {
            console.error('Failed to load seasons', err);
        }
    };

    const loadEpisodes = async (seasonId) => {
        try {
            const user = await jellyfinService.getCurrentUser();
            const data = await jellyfinService.getEpisodes(user.Id, seriesId, seasonId);
            setEpisodes(data.Items || []);
            if (!selectedEpisode && data.Items.length > 0) {
                setSelectedEpisode(data.Items[0].Id);
            } else if (selectedEpisode) {
                // Verify selected episode is in new list, if not select first
                if (!data.Items.find(e => e.Id === selectedEpisode)) {
                    setSelectedEpisode(data.Items[0] ? data.Items[0].Id : '');
                }
            }
        } catch (err) {
            console.error('Failed to load episodes', err);
        }
    };

    const loadCurrentSubtitles = async () => {
        if (!selectedEpisode) return;
        setLoadingSubs(true);
        setError(null);
        try {
            const user = await jellyfinService.getCurrentUser();
            const streams = await jellyfinService.getMediaStreams(user.Id, selectedEpisode);
            setCurrentSubtitles(streams.filter(s => s.Type === 'Subtitle'));
        } catch (err) {
            setError('Failed to load subtitles.');
            console.error(err);
        } finally {
            setLoadingSubs(false);
        }
    };

    const handleDelete = async (index) => {
        if (!window.confirm('Are you sure you want to delete this subtitle?')) return;
        try {
            await jellyfinService.deleteSubtitle(selectedEpisode, index); // index is usually passed
            loadCurrentSubtitles();
        } catch (err) {
            alert('Failed to delete subtitle');
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!selectedEpisode) return;
        setSearching(true);
        setSearchResults([]);
        try {
            const results = await jellyfinService.searchRemoteSubtitles(selectedEpisode, searchLanguage);
            setSearchResults(results || []);
        } catch (err) {
            alert('Search failed');
        } finally {
            setSearching(false);
        }
    };

    const handleDownload = async (subtitleId) => {
        try {
            await jellyfinService.downloadRemoteSubtitles(selectedEpisode, subtitleId);
            alert('Subtitle downloaded!');
            loadCurrentSubtitles();
        } catch (err) {
            alert('Download failed');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="lf-modal-overlay" style={{
            position: 'fixed', inset: 0, bg: 'rgba(0,0,0,0.85)', zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)'
        }}>
            <div style={{
                background: '#1c1c1c', borderRadius: '12px', width: '100%', maxWidth: '800px',
                maxHeight: '85vh', display: 'flex', flexDirection: 'column', margin: '20px'
            }}>
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: 'white' }}>Subtitles Manager</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {/* Selectors */}
                    {/* Selectors - Hide for Movies */
                        !isMovie && (
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', color: '#ccc', marginBottom: '5px', fontSize: '0.85rem' }}>Season</label>
                                    <select
                                        value={selectedSeason}
                                        onChange={e => { setSelectedSeason(e.target.value); setSelectedEpisode(''); }}
                                        style={{ width: '100%', padding: '10px', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}
                                    >
                                        {seasons.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', color: '#ccc', marginBottom: '5px', fontSize: '0.85rem' }}>Episode</label>
                                    <select
                                        value={selectedEpisode}
                                        onChange={e => setSelectedEpisode(e.target.value)}
                                        style={{ width: '100%', padding: '10px', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}
                                    >
                                        {episodes.map(e => <option key={e.Id} value={e.Id}>{e.IndexNumber}. {e.Name}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                    {/* Current Subtitles */}
                    <div style={{ marginBottom: '30px' }}>
                        <h4 style={{ color: '#ddd', marginBottom: '10px' }}>Current Subtitles</h4>
                        {loadingSubs ? <div>Loading...</div> : (
                            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '5px' }}>
                                {currentSubtitles.length === 0 ? <div style={{ padding: '10px', opacity: 0.7 }}>No subtitles found.</div> :
                                    currentSubtitles.map((sub, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ color: 'white', fontWeight: 500 }}>{sub.DisplayTitle || sub.Language || 'Unknown'}</div>
                                                <div style={{ color: '#aaa', fontSize: '0.8rem' }}>{sub.IsExternal ? 'External' : 'Embedded'} • {sub.Codec}</div>
                                            </div>
                                            {sub.IsExternal && (
                                                <button
                                                    onClick={() => handleDelete(sub.Index)}
                                                    style={{ background: 'rgba(233, 30, 99, 0.2)', color: '#ff4081', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    ))
                                }
                            </div>
                        )}
                    </div>

                    {/* Search Section */}
                    <div>
                        <h4 style={{ color: '#ddd', marginBottom: '10px' }}>Search New Subtitles</h4>
                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <select
                                value={searchLanguage}
                                onChange={e => setSearchLanguage(e.target.value)}
                                style={{ flex: 1, padding: '10px', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}
                            >
                                <option value="eng">English</option>
                                <option value="spa">Spanish</option>
                                <option value="fre">French</option>
                                <option value="hun">Hungarian</option>
                                {/* Add more langs as needed */}
                            </select>
                            <button
                                type="submit"
                                disabled={searching || !selectedEpisode}
                                style={{ background: '#ff6a00', color: 'white', border: 'none', padding: '0 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                {searching ? 'Searching...' : 'Search'}
                            </button>
                        </form>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                                {searchResults.map((res) => (
                                    <div key={res.Id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
                                        <div style={{ overflow: 'hidden', marginRight: '10px' }}>
                                            <div style={{ color: 'white', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{res.Name}</div>
                                            <div style={{ color: '#aaa', fontSize: '0.8rem' }}>{res.Format} • {res.ProviderName} • {res.DownloadCount} DLs</div>
                                        </div>
                                        <button
                                            onClick={() => handleDownload(res.Id)}
                                            style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                        >
                                            Download
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

SubtitleModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    seriesId: PropTypes.string,
    initialSeasonId: PropTypes.string,
    initialEpisodeId: PropTypes.string,
    isMovie: PropTypes.bool
};

export default SubtitleModal;
