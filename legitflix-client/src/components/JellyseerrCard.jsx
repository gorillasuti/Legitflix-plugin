import React from 'react';
import { useTheme } from '../context/ThemeContext';
import './JellyseerrCard.css';

const JellyseerrCard = () => {
    const { config } = useTheme();

    if (!config.enableJellyseerr) return null;

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
                    style={{ backgroundImage: `url('${config.jellyseerrBackground || "https://belginux.com/content/images/size/w1200/2024/03/jellyseerr-1.webp"}')` }}
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
