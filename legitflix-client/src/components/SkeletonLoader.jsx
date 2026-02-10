import React from 'react';
import './SkeletonLoader.css';

const SkeletonLoader = ({ type = 'text', width, height, style = {} }) => {
    return (
        <div
            className={`skeleton skeleton-${type}`}
            style={{ width, height, ...style }}
        ></div>
    );
};

export default SkeletonLoader;
