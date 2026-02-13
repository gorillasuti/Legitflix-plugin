import React from 'react';
import { useTheme } from '../context/ThemeContext';
import './JellyseerrCard.css';

const JellyseerrCard = () => {
    const { config } = useTheme();

    // Default to true if undefined, consistent with Settings Modal logic
    if (config.enableJellyseerr === false) return null;

    return (
        <div className="library-card jellyseerr-card-wrapper">
            <a
                href={config.jellyseerrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="jellyseerr-card"
            >
                <div
                    className="jellyseerr-image"
                    style={{ backgroundImage: `url('${config.jellyseerrBackground || "https://raw.githubusercontent.com/gorillasuti/Legitflix-plugin/refs/heads/main/legitflix-client/public/jellyseerr.jpg"}')` }}
                >
                    <div className="jellyseerr-overlay"></div>
                    <div className="jellyseerr-content">
                        <span className="material-icons card-icon">add_circle_outline</span>
                        <span className="card-label">{config.jellyseerrText || 'Request Feature'}</span>
                    </div>
                </div>
            </a>
        </div>
    );
};

export default JellyseerrCard;
