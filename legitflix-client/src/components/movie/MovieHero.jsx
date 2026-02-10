import React, { useState, useEffect } from 'react';

export default function MovieHero({ item }) {
    const backdropUrl = item.BackdropImageTags && item.BackdropImageTags.length > 0
        ? `/Items/${item.Id}/Images/Backdrop/0`
        : null;

    const logoUrl = item.ImageTags && item.ImageTags.Logo
        ? `/Items/${item.Id}/Images/Logo`
        : null;

    const year = item.ProductionYear;
    const rating = item.OfficialRating;
    const communityRating = item.CommunityRating ? item.CommunityRating.toFixed(1) : '';
    const duration = item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600000000) + ' min' : ''; // Approx
    const description = item.Overview;

    return (
        <div className="relative w-full min-h-[85vh] flex flex-col justify-end p-16 overflow-hidden transition-opacity duration-500">
            {/* Backdrop */}
            <div className="absolute inset-0 z-0 select-none">
                {backdropUrl && (
                    <div
                        className="absolute inset-0 bg-cover bg-top transition-opacity duration-1000"
                        style={{ backgroundImage: `url(${backdropUrl})` }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/60 to-[#141414]/40" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex gap-10 items-end max-w-[1400px] w-full mx-auto animate-fade-up">
                {/* Left Info */}
                <div className="flex-1 pb-5 flex flex-col gap-4">
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={item.Name}
                            className="max-w-[500px] max-h-[250px] w-auto object-contain block mb-4 drop-shadow-lg"
                        />
                    ) : (
                        <h1 className="text-6xl font-extrabold mb-2 drop-shadow-md font-display">{item.Name}</h1>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-gray-300 text-base flex-wrap">
                        {year && <span>{year}</span>}
                        {rating && <span className="px-1.5 py-0.5 border border-white/20 rounded text-xs">{rating}</span>}
                        {communityRating && (
                            <div className="flex items-center gap-1 text-yellow-400">
                                <span className="material-icons text-sm">star</span>
                                <span>{communityRating}</span>
                            </div>
                        )}
                        {duration && <span>{duration}</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 mt-4">
                        <button className="flex items-center gap-2 px-6 py-3 bg-lf-primary hover:bg-lf-primary/90 rounded-md font-semibold text-white transition-colors">
                            <span className="material-icons">play_arrow</span>
                            Play
                        </button>
                        <button className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-md font-semibold text-white transition-colors border border-white/10">
                            <span className="material-icons">movie</span>
                            Trailer
                        </button>
                    </div>

                    {/* Description */}
                    <div className="max-w-2xl mt-4">
                        <p className="text-lg text-gray-200 line-clamp-3 leading-relaxed drop-shadow-sm">
                            {description}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
