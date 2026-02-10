import React from 'react';
import './SkeletonLoader.css';

const SkeletonLoader = () => {
    return (
        <div className="lf-loader-overlay">
            <img
                className="lf-loader-logo"
                src="https://i.imgur.com/9tbXBxu.png"
                alt="LegitFlix"
            />
            <div className="lf-spinner"></div>
        </div>
    );
};

export default SkeletonLoader;
