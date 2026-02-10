
import React, { useState, useEffect, useRef } from 'react';
import { jellyfinService } from '../services/jellyfin';
import MediaCard from './MediaCard/MediaCard';
import SkeletonLoader from './SkeletonLoader';
import './MediaRow.css';

const MediaRow = ({ title, libraryId, onCardClick }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const rowRef = useRef(null);

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            try {
                const user = await jellyfinService.getCurrentUser();
                if (user && libraryId) {
                    const res = await jellyfinService.getLatestItems(user.Id, libraryId, 20);
                    if (res && res.Items) {
                        setItems(res.Items);
                    }
                }
            } catch (e) {
                console.error("MediaRow fetch error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, [libraryId]);

    const scroll = (direction) => {
        if (rowRef.current) {
            const row = rowRef.current;
            const scrollAmount = window.innerWidth * 0.8;
            row.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    if (loading) {
        return (
            <div className="media-row-container">
                <div style={{ padding: '0 4%', marginBottom: '15px' }}>
                    <SkeletonLoader width="150px" height="24px" />
                </div>
                <div className="media-row-wrapper" style={{ paddingLeft: '4%', display: 'flex', gap: '15px', overflow: 'hidden' }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} style={{ flex: '0 0 200px' }}>
                            <SkeletonLoader width="100%" height="300px" style={{ borderRadius: '8px' }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (items.length === 0) return null;

    return (
        <div className="media-row-container">
            <h2 className="media-row-title">{title}</h2>
            <div className="media-row-wrapper">
                <button className="row-arrow left" onClick={() => scroll('left')}>
                    <span className="material-icons">chevron_left</span>
                </button>

                <div className="media-row-scroll" ref={rowRef}>
                    {items.map(item => (
                        <MediaCard
                            key={item.Id}
                            item={item}
                            onClick={onCardClick}
                        />
                    ))}
                </div>

                <button className="row-arrow right" onClick={() => scroll('right')}>
                    <span className="material-icons">chevron_right</span>
                </button>
            </div>
        </div>
    );
};

export default MediaRow;
