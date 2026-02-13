import React, { useEffect, useState } from 'react';
import { jellyfinService } from '../../services/jellyfin';
import './HoverCard.css';

const HoverCard = ({ item, onPlay, onDetails, onContextMenu }) => {
    // Stateless: Use item directly. Data is assumed pre-fetched.
    const details = item;

    return (
        <div
            className="legitflix-hover-overlay"
            onClick={(e) => {
                e.stopPropagation(); // Prevent card click
                onDetails();
            }}
            onContextMenu={onContextMenu}
        >
            <div className="hover-body">
                <h3 className="hover-title">{details.Name}</h3>
                <div className="hover-row">
                    {rating && (
                        <span className="hover-rating">
                            <span className="material-icons">star</span> {rating}
                        </span>
                    )}
                    {year && <span className="hover-seasons">{year}</span>}
                    {isSeries && seasons && <span className="hover-seasons">{seasons}</span>}
                    {isSeries && unplayed && <span className="hover-unplayed">{unplayed}</span>}
                </div>
                <div className="hover-desc">
                    {details.Overview || "No description available."}
                </div>
            </div>

            <div className="hover-footer">
                <div className="hover-native-btn-slot">
                    <button className="hover-btn-primary" onClick={(e) => {
                        e.stopPropagation();
                        onPlay();
                    }} title="Play">
                        <span className="material-icons">play_arrow</span>
                    </button>
                </div>
                <div className="hover-icon-row">
                    <button className="hover-icon-btn" title="Add to Favorites" onClick={(e) => {
                        e.stopPropagation();
                        // TODO: toggle fav
                    }}>
                        <span className="material-icons">favorite_border</span>
                    </button>
                    <button className="hover-icon-btn" title="Mark Played" onClick={(e) => {
                        e.stopPropagation();
                        // TODO: toggle played
                    }}>
                        <span className="material-icons">check</span>
                    </button>
                    <button className="hover-icon-btn" title="More Info" onClick={(e) => {
                        e.stopPropagation();
                        onDetails();
                    }}>
                        <span className="material-icons">info_outline</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HoverCard;
