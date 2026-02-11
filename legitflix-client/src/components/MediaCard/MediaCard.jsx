import React, { useState, useRef, useEffect } from 'react';
import { jellyfinService } from '../../services/jellyfin';
import HoverCard from '../HoverCard/HoverCard';
import './MediaCard.css';

const MediaCard = ({ item, onClick }) => {
    const [showHover, setShowHover] = useState(false);
    const hoverTimeoutRef = useRef(null);

    const handleMouseEnter = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setShowHover(true);
        }, 300); // 300ms delay before showing hover card
    };

    const handleMouseLeave = () => {
        setShowHover(false);
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
    };

    // Clean up timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        };
    }, []);

    const imageUrl = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?fillHeight=300&fillWidth=200&quality=90`;

    return (
        <div
            className="media-card-wrapper"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="media-card" onClick={() => onClick(item)}>
                <div className="media-card-image">
                    <img
                        src={imageUrl}
                        alt={item.Name}
                        loading="lazy"
                    />
                </div>
                {/* Fallback title if image fails or for accessibility, though typically hidden if card has standard styling */}
                <div className="media-card-title">{item.Name}</div>

                {/* OVERLAY */}
                {showHover && (
                    <HoverCard
                        item={item}
                        isVisible={showHover}
                        onPlay={() => onClick(item)} // For now, play clicks just go to details or we can integrate playback
                        onDetails={() => onClick(item)}
                    />
                )}
            </div>
        </div>
    );
};

export default MediaCard;
