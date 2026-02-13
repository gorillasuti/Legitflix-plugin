import React, { useState, useEffect, useRef } from 'react';
import { jellyfinService } from '../services/jellyfin';
import MediaCard from './MediaCard';
import SkeletonLoader from './SkeletonLoader';
import './MediaRow.css';
import { useNavigate } from 'react-router-dom';
import { useDraggableScroll } from '../hooks/useDraggableScroll';

const MediaRow = ({ title, libraryId, onCardClick }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const rowRef = useRef(null);
    const { events } = useDraggableScroll(rowRef);
    const navigate = useNavigate();

    const updateScrollState = () => {
        if (rowRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
            setCanScrollLeft(scrollLeft > 5);
            setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
        }
    };

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            try {
                const user = await jellyfinService.getCurrentUser();
                if (user && libraryId) {
                    const res = await jellyfinService.getLatestItems(user.Id, libraryId);
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

    // Update scroll state when items or window size changes
    useEffect(() => {
        if (!loading && items.length > 0) {
            // Delay slightly to ensure DOM is updated
            const timer = setTimeout(updateScrollState, 100);
            window.addEventListener('resize', updateScrollState);
            return () => {
                window.removeEventListener('resize', updateScrollState);
                clearTimeout(timer);
            };
        }
    }, [loading, items]);

    const scroll = (direction) => {
        if (rowRef.current) {
            const row = rowRef.current;
            const scrollAmount = window.innerWidth * 0.8;
            row.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });

            // Re-check scroll state after animation
            setTimeout(updateScrollState, 500);
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
                        <div key={i} style={{ flex: '0 0 160px' }}>
                            <SkeletonLoader width="100%" height="240px" style={{ borderRadius: '8px' }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (items.length === 0) return null;

    return (
        <div className="media-row-container">
            <h2 className="media-row-title"
                onClick={() => navigate(`/library/${libraryId}`)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
                {title} <span style={{ fontSize: '0.8em', opacity: 0.7 }}>›</span>
            </h2>
            <div className="media-row-wrapper">
                {canScrollLeft && (
                    <button className="row-arrow left" onClick={() => scroll('left')}>
                        <span className="material-icons">chevron_left</span>
                    </button>
                )}

                <div
                    className="media-row-scroll cursor-grab active:cursor-grabbing"
                    ref={rowRef}
                    onScroll={updateScrollState}
                    {...events}
                >
                    {items.map(item => (
                        <MediaCard
                            key={item.Id}
                            item={item}
                            onClick={() => onCardClick ? onCardClick(item) : navigate(`/item/${item.Id}`)}
                            onContextMenu={onContextMenu}
                        />
                    ))}
                </div>

                {canScrollRight && (
                    <button className="row-arrow right" onClick={() => scroll('right')}>
                        <span className="material-icons">chevron_right</span>
                    </button>
                )}
            </div>
        </div>
    );
};

export default MediaRow;
