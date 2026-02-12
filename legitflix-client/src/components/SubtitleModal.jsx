import React, { useState, useEffect } from 'react';
import jellyfinService from '../services/jellyfin';
import PropTypes from 'prop-types';
import './SubtitleModal.css';

const LANGUAGES = {
    popular: [
        { code: 'eng', name: 'English' },
        { code: 'spa', name: 'Spanish' },
        { code: 'jpn', name: 'Japanese' },
        { code: 'hun', name: 'Hungarian' },
    ],
    more: [
        { code: 'ara', name: 'Arabic' },
        { code: 'bul', name: 'Bulgarian' },
        { code: 'chi', name: 'Chinese' },
        { code: 'hrv', name: 'Croatian' },
        { code: 'cze', name: 'Czech' },
        { code: 'dan', name: 'Danish' },
        { code: 'dut', name: 'Dutch' },
        { code: 'fin', name: 'Finnish' },
        { code: 'fre', name: 'French' },
        { code: 'ger', name: 'German' },
        { code: 'gre', name: 'Greek' },
        { code: 'heb', name: 'Hebrew' },
        { code: 'hin', name: 'Hindi' },
        { code: 'ind', name: 'Indonesian' },
        { code: 'ita', name: 'Italian' },
        { code: 'kor', name: 'Korean' },
        { code: 'may', name: 'Malay' },
        { code: 'nor', name: 'Norwegian' },
        { code: 'per', name: 'Persian' },
        { code: 'pol', name: 'Polish' },
        { code: 'por', name: 'Portuguese' },
        { code: 'rum', name: 'Romanian' },
        { code: 'rus', name: 'Russian' },
        { code: 'srp', name: 'Serbian' },
        { code: 'slo', name: 'Slovak' },
        { code: 'slv', name: 'Slovenian' },
        { code: 'swe', name: 'Swedish' },
        { code: 'tha', name: 'Thai' },
        { code: 'tur', name: 'Turkish' },
        { code: 'ukr', name: 'Ukrainian' },
        { code: 'vie', name: 'Vietnamese' },
    ],
};

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
                setSelectedEpisode(initialEpisodeId || seriesId);
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
            await jellyfinService.deleteSubtitle(selectedEpisode, index);
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
        <div className="lf-sub-overlay" onClick={onClose}>
            <div className="lf-sub-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="lf-sub-header">
                    <h3>Subtitles Manager</h3>
                    <button className="lf-sub-header__close" onClick={onClose}>
                        <span className="material-icons">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="lf-sub-content">
                    {/* Selectors — Hide for Movies */}
                    {!isMovie && (
                        <div className="lf-sub-selectors">
                            <div>
                                <label className="lf-sub-label">Season</label>
                                <select
                                    className="lf-sub-select"
                                    value={selectedSeason}
                                    onChange={e => { setSelectedSeason(e.target.value); setSelectedEpisode(''); }}
                                >
                                    {seasons.map(s => <option key={s.Id} value={s.Id}>{s.Name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="lf-sub-label">Episode</label>
                                <select
                                    className="lf-sub-select"
                                    value={selectedEpisode}
                                    onChange={e => setSelectedEpisode(e.target.value)}
                                >
                                    {episodes.map(e => <option key={e.Id} value={e.Id}>{e.IndexNumber}. {e.Name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Current Subtitles */}
                    <div className="lf-sub-section">
                        <h4 className="lf-sub-section-title">Current Subtitles</h4>
                        {loadingSubs ? (
                            <div className="lf-sub-loading">
                                <span className="material-icons">sync</span>
                                Loading…
                            </div>
                        ) : (
                            <div className="lf-sub-list">
                                {currentSubtitles.length === 0 ? (
                                    <div className="lf-sub-list__empty">No subtitles found.</div>
                                ) : (
                                    currentSubtitles.map((sub, idx) => (
                                        <div key={idx} className="lf-sub-list__item">
                                            <div>
                                                <div className="lf-sub-list__name">{sub.DisplayTitle || sub.Language || 'Unknown'}</div>
                                                <div className="lf-sub-list__meta">{sub.IsExternal ? 'External' : 'Embedded'} • {sub.Codec}</div>
                                            </div>
                                            {sub.IsExternal && (
                                                <button
                                                    className="lf-sub-action-btn lf-sub-action-btn--delete"
                                                    onClick={() => handleDelete(sub.Index)}
                                                >
                                                    <span className="material-icons">delete_outline</span>
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Search Section */}
                    <div className="lf-sub-section">
                        <h4 className="lf-sub-section-title">Search Subtitles</h4>
                        <form onSubmit={handleSearch} className="lf-sub-search-row">
                            <select
                                className="lf-sub-select"
                                value={searchLanguage}
                                onChange={e => setSearchLanguage(e.target.value)}
                                style={{ flex: 1 }}
                            >
                                <optgroup label="Popular">
                                    {LANGUAGES.popular.map(l => (
                                        <option key={l.code} value={l.code}>{l.name}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="More Languages">
                                    {LANGUAGES.more.map(l => (
                                        <option key={l.code} value={l.code}>{l.name}</option>
                                    ))}
                                </optgroup>
                            </select>
                            <button
                                type="submit"
                                disabled={searching || !selectedEpisode}
                                className="lf-sub-action-btn lf-sub-action-btn--search"
                            >
                                <span className="material-icons">search</span>
                                {searching ? 'Searching…' : 'Search'}
                            </button>
                        </form>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="lf-sub-list">
                                {searchResults.map((res) => (
                                    <div key={res.Id} className="lf-sub-list__item">
                                        <div className="lf-sub-list__info">
                                            <div className="lf-sub-list__name">{res.Name}</div>
                                            <div className="lf-sub-list__meta">{res.Format} • {res.ProviderName} • {res.DownloadCount} DLs</div>
                                        </div>
                                        <button
                                            className="lf-sub-action-btn lf-sub-action-btn--download"
                                            onClick={() => handleDownload(res.Id)}
                                        >
                                            <span className="material-icons">download</span>
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
