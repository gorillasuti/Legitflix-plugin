
import React, { useState, useEffect, useRef } from 'react';
import { jellyfinService } from '../services/jellyfin';
import MediaCard from './MediaCard/MediaCard';
import './MediaRow.css';

const MediaRow = ({ title, libraryId, onCardClick }) => {
    const [items, setItems] = useState([]);
    const rowRef = useRef(null);

    useEffect(() => {
        const fetchItems = async () => {
            const user = await jellyfinService.getCurrentUser();
            if (user && libraryId) {
                // Fetch "Latest"
                const res = await jellyfinService.getLatestItems(user.Id, libraryId, 20);
                if (res && res.Items) {
                    setItems(res.Items);
                }
            }
        };
        fetchItems();
    }, [libraryId]);

    const scroll = (direction) => {
        if (rowRef.current) {
            const { current: row } = rowRef;
            const scrollAmount = window.innerWidth * 0.8;
            row.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

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
