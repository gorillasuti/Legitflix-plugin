import React from 'react';
import './DetailSkeleton.css';
import SkeletonLoader from './SkeletonLoader';

const DetailSkeleton = () => {
    return (
        <div className="lf-detail-skeleton">
            {/* Hero Section Skeleton */}
            <div className="lf-detail-skeleton__hero">
                {/* Poster Placeholder */}
                <div className="lf-detail-skeleton__poster">
                    <SkeletonLoader width="100%" height="100%" />
                </div>

                {/* Info Column */}
                <div className="lf-detail-skeleton__info">
                    {/* Title */}
                    <SkeletonLoader width="60%" height="3rem" style={{ marginBottom: '1rem' }} />

                    {/* Meta Row */}
                    <div className="lf-detail-skeleton__meta">
                        <SkeletonLoader width="50px" height="1.2rem" />
                        <SkeletonLoader width="80px" height="1.2rem" />
                        <SkeletonLoader width="60px" height="1.2rem" />
                    </div>

                    {/* Description Lines */}
                    <div className="lf-detail-skeleton__desc">
                        <SkeletonLoader width="100%" height="1rem" style={{ marginBottom: '0.5rem' }} />
                        <SkeletonLoader width="90%" height="1rem" style={{ marginBottom: '0.5rem' }} />
                        <SkeletonLoader width="95%" height="1rem" style={{ marginBottom: '1.5rem' }} />
                    </div>

                    {/* Buttons Row */}
                    <div className="lf-detail-skeleton__actions">
                        <SkeletonLoader width="140px" height="48px" style={{ borderRadius: '8px' }} />
                        <SkeletonLoader width="140px" height="48px" style={{ borderRadius: '8px' }} />
                        <SkeletonLoader width="48px" height="48px" style={{ borderRadius: '50%' }} />
                    </div>
                </div>
            </div>

            <div className="lf-detail-skeleton__divider"></div>

            {/* Content Row Skeleton */}
            <div className="lf-detail-skeleton__content">
                <SkeletonLoader width="200px" height="2rem" style={{ marginBottom: '1rem' }} />
                <div className="lf-detail-skeleton__grid">
                    {[1, 2, 3, 4, 5].map(i => (
                        <SkeletonLoader key={i} width="100%" height="150px" style={{ borderRadius: '12px' }} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DetailSkeleton;
