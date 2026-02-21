// Reusable skeleton placeholder for loading states
import React from 'react';
import './Skeleton.css';

export const SkeletonLine = ({ width = '100%', height = '1rem' }) => (
    <div className="skeleton-line" style={{ width, height }} aria-hidden="true" />
);

export const SkeletonCard = () => (
    <div className="skeleton-card" aria-hidden="true">
        <div className="skeleton-card-block" style={{ height: '80px' }} />
        <SkeletonLine width="70%" />
        <SkeletonLine width="90%" />
        <SkeletonLine width="40%" />
    </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
    <div className="skeleton-table" aria-hidden="true">
        <div className="skeleton-table-header">
            {Array.from({ length: cols }).map((_, i) => (
                <div key={i} className="skeleton-line" style={{ height: '1.25rem', flex: 1 }} />
            ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="skeleton-table-row">
                {Array.from({ length: cols }).map((_, c) => (
                    <SkeletonLine key={c} width={c === 0 ? '40%' : '60%'} height="0.9rem" />
                ))}
            </div>
        ))}
    </div>
);

const Skeleton = ({ variant = 'lines', message }) => (
    <div className="skeleton-wrapper">
        {variant === 'card' && <SkeletonCard />}
        {variant === 'table' && <SkeletonTable />}
        {(variant === 'lines' || !variant) && (
            <>
                <SkeletonLine width="100%" />
                <SkeletonLine width="85%" />
                <SkeletonLine width="60%" />
            </>
        )}
        {message && <p className="skeleton-message">{message}</p>}
    </div>
);

export default Skeleton;
