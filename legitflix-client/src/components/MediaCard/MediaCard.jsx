import React, { useState, useRef, useEffect } from 'react';
import { jellyfinService } from '../../services/jellyfin';
import HoverCard from '../HoverCard/HoverCard';
import './MediaCard.css';

const MediaCard = ({ item, onClick }) => {
    const imageUrl = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?fillHeight=300&fillWidth=200&quality=90`;

    return (
        <div
            className="media-card-wrapper"
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
                <HoverCard
                    item={item}
                    onPlay={() => onClick(item)}
                    onDetails={() => onClick(item)}
                />
            </div>
        </div>
    );
};

export default MediaCard;
