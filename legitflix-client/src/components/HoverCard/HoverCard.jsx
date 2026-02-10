import React, { useEffect, useState } from 'react';
import { jellyfinService } from '../../services/jellyfin';
import './HoverCard.css';

const HoverCard = ({ item, isVisible, onPlay, onDetails }) => {
    const [details, setDetails] = useState(item);

    useEffect(() => {
        if (isVisible && !item.Overview) { // Fetch if detail missing
            const fetchDetails = async () => {
                try {
                    const fullerItem = await jellyfinService.getItem(item.Id);
                    setDetails(fullerItem);
                } catch (e) {
                    console.error("Failed to fetch details for hover card", e);
                }
            };
            fetchDetails();
        } else {
            setDetails(item);
        }
    }, [isVisible, item]);

    if (!isVisible) return null;

    const isSeries = details.Type === 'Series';
    const rating = details.CommunityRating ? parseFloat(details.CommunityRating).toFixed(1) : null;
    const year = details.ProductionYear || (details.PremiereDate ? new Date(details.PremiereDate).getFullYear() : '');

    // Series specific
    const seasons = details.ChildCount ? `${details.ChildCount} Seasons` : ''; // simplified logic
    const unplayed = details.UserData?.UnplayedItemCount ? `${details.UserData.UnplayedItemCount} Unplayed` : '';

    return (
        <div className={`legitflix-hover-overlay ${isVisible ? 'is-loaded' : ''}`} onClick={(e) => {
            e.stopPropagation(); // Prevent card click
            onDetails();
        }}>
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
