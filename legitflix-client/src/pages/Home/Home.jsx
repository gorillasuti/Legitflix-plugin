import ContextMenu from '../../components/ContextMenu';

// ... existing imports ...

const Home = () => {
    // ... existing state ...
    const [contextMenu, setContextMenu] = useState(null); // { x, y, item }

    // ... existing useEffect ...

    const handleContextMenu = (e, item) => {
        e.preventDefault();
        setContextMenu({
            x: e.pageX,
            y: e.pageY,
            item: item
        });
    };

    const closeContextMenu = () => {
        setContextMenu(null);
    };

    const handleMenuAction = async (action, item) => {
        closeContextMenu();
        switch (action) {
            case 'play':
                if (item.Type === 'Movie' || item.Type === 'Episode') {
                    navigate(`/play/${item.Id}`);
                } else {
                    navigate(`/item/${item.Id}`, { state: { autoplay: true } });
                }
                break;
            case 'shuffle':
                // navigate(`/play/${item.Id}?shuffle=true`); // TODO: Implement Shuffle Play
                console.log('Shuffle play not fully implemented yet');
                break;
            case 'download':
                const url = jellyfinService.getDownloadUrl(item.Id);
                window.open(url, '_blank');
                break;
            case 'delete':
                if (window.confirm(`Are you sure you want to delete "${item.Name}"? This cannot be undone.`)) {
                    await jellyfinService.deleteItem(item.Id);
                    // Refresh data
                    // setLibraries triggers re-fetch, but maybe we need a force refresh key
                    // For now, reloading page or just refetching logic
                    window.location.reload();
                }
                break;
            case 'refresh':
                await jellyfinService.refreshItem(item.Id);
                break;
            default:
                console.log('Action not implemented:', action);
                break;
        }
    };

    const getContextMenuOptions = (item) => {
        if (!item) return [];
        return [
            { label: 'Play', icon: 'play_arrow', action: () => handleMenuAction('play', item) },
            { label: 'Shuffle', icon: 'shuffle', action: () => handleMenuAction('shuffle', item) },
            { type: 'separator' },
            { label: 'Select', icon: 'check_circle_outline', action: () => handleMenuAction('select', item) },
            { label: 'Add to collection', icon: 'playlist_add', action: () => handleMenuAction('add_collection', item) },
            { label: 'Add to playlist', icon: 'queue_music', action: () => handleMenuAction('add_playlist', item) },
            { label: 'Download', icon: 'download', action: () => handleMenuAction('download', item) },
            { label: 'Delete', icon: 'delete', danger: true, action: () => handleMenuAction('delete', item) },
            { type: 'separator' },
            { label: 'Edit metadata', icon: 'edit', action: () => handleMenuAction('edit_metadata', item) },
            { label: 'Edit images', icon: 'image', action: () => handleMenuAction('edit_images', item) },
            { label: 'Identify', icon: 'search', action: () => handleMenuAction('identify', item) },
            { label: 'Refresh metadata', icon: 'refresh', action: () => handleMenuAction('refresh', item) },
        ];
    };

    return (
        <div className="home-page">
            <Navbar />
            <HeroCarousel onInfoClick={openModal} />

            <div className="home-content-container" style={{ position: 'relative', zIndex: 10 }}>
                {loading ? (
                    // ... existing skeleton loader ...
                    <div style={{ padding: '0 4.2%', marginTop: '40px' }}>
                        {/* Browse Libraries Row */}
                        <SkeletonLoader width="180px" height="24px" style={{ marginBottom: '20px' }} />
                        <div style={{ display: 'flex', gap: '15px', overflow: 'hidden', marginBottom: '50px' }}>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} style={{ flex: '0 0 15vw', minWidth: '140px', maxWidth: '240px' }}>
                                    <SkeletonLoader width="100%" height="150%" style={{ borderRadius: '8px', aspectRatio: '2/3' }} />
                                </div>
                            ))}
                        </div>

                        {/* Continue Watching Row - 16:9 Aspect Ratio */}
                        <SkeletonLoader width="220px" height="24px" style={{ marginBottom: '20px' }} />
                        <div style={{ display: 'flex', gap: '15px', overflow: 'hidden', marginBottom: '50px' }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} style={{ flex: '0 0 320px' }}>
                                    <SkeletonLoader width="100%" height="180px" style={{ borderRadius: '6px', marginBottom: '8px' }} />
                                    <SkeletonLoader width="70%" height="14px" style={{ marginBottom: '4px' }} />
                                    <SkeletonLoader width="40%" height="12px" />
                                </div>
                            ))}
                        </div>

                        {/* History Row - 16:9 Aspect Ratio */}
                        <SkeletonLoader width="220px" height="24px" style={{ marginBottom: '20px' }} />
                        <div style={{ display: 'flex', gap: '15px', overflow: 'hidden', marginBottom: '50px' }}>
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} style={{ flex: '0 0 320px' }}>
                                    <SkeletonLoader width="100%" height="180px" style={{ borderRadius: '6px', marginBottom: '8px' }} />
                                    <SkeletonLoader width="70%" height="14px" style={{ marginBottom: '4px' }} />
                                    <SkeletonLoader width="40%" height="12px" />
                                </div>
                            ))}
                        </div>

                        {/* Promo Section: Hero + 2 Cards */}
                        <div style={{ marginBottom: '50px' }}>
                            {/* Hero Skeleton */}
                            <div style={{ width: '100%', height: '500px', marginBottom: '16px', position: 'relative' }}>
                                <SkeletonLoader width="100%" height="100%" style={{ borderRadius: '12px' }} />
                                {/* Fake Content inside Hero */}
                                <div style={{ position: 'absolute', top: '40%', left: '40px', width: '40%' }}>
                                    <SkeletonLoader width="60%" height="60px" style={{ marginBottom: '20px' }} />
                                    <SkeletonLoader width="40%" height="20px" style={{ marginBottom: '20px' }} />
                                    <SkeletonLoader width="100%" height="16px" style={{ marginBottom: '8px' }} />
                                    <SkeletonLoader width="90%" height="16px" style={{ marginBottom: '24px' }} />
                                    <SkeletonLoader width="140px" height="45px" style={{ borderRadius: '6px' }} />
                                </div>
                            </div>
                            {/* Two Small Cards */}
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ flex: 1, height: '260px' }}>
                                    <SkeletonLoader width="100%" height="100%" style={{ borderRadius: '12px' }} />
                                </div>
                                <div style={{ flex: 1, height: '260px' }}>
                                    <SkeletonLoader width="100%" height="100%" style={{ borderRadius: '12px' }} />
                                </div>
                            </div>
                        </div>

                        {/* Latest Media Row */}
                        <SkeletonLoader width="180px" height="24px" style={{ marginBottom: '20px' }} />
                        <div style={{ display: 'flex', gap: '15px', overflow: 'hidden' }}>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} style={{ flex: '0 0 15vw', minWidth: '140px', maxWidth: '240px' }}>
                                    <SkeletonLoader width="100%" height="150%" style={{ borderRadius: '8px', aspectRatio: '2/3' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* 1. Jellyseerr & Library Navigation */}
                        <section className="home-section" style={{ paddingLeft: '4%', paddingRight: '4%', marginBottom: '40px' }}>
                            <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>Browse Libraries</h2>
                            <DraggableRow className="libraries-grid">
                                {libraries.map(lib => (
                                    <div
                                        key={lib.Id}
                                        className="library-card"
                                        onClick={(e) => {
                                            navigate(`/library/${lib.Id}`)
                                        }}
                                    >
                                        <img
                                            src={`${jellyfinService.api.basePath}/Items/${lib.Id}/Images/Primary?fillHeight=480&fillWidth=320&quality=90`}
                                            alt={lib.Name}
                                            className="library-card-image"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex'; // Show fallback if image fails
                                            }}
                                            draggable={false}
                                        />
                                        <div className="library-card-content fallback" style={{ display: 'none' }}>
                                            <span className="material-icons library-icon">
                                                {lib.CollectionType === 'movies' ? 'movie' :
                                                    lib.CollectionType === 'tvshows' ? 'tv' : 'folder'}
                                            </span>
                                        </div>
                                        {config.showLibraryTitles && (
                                            <div className="library-card-overlay">
                                                <span className="library-name">{lib.Name}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <JellyseerrCard />
                            </DraggableRow>
                        </section>

                        {/* 2. Continue Watching */}
                        {resumeItems.length > 0 && (
                            <section className="home-section" style={{ paddingLeft: '4%', paddingRight: '4%', marginBottom: '40px' }}>
                                <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>Continue Watching</h2>
                                <DraggableRow className="backdrop-scroll-container">
                                    {resumeItems.map(item => {
                                        const played = item.UserData?.PlayedPercentage >= 100 || item.UserData?.Played;
                                        const ticksLeft = item.RunTimeTicks && item.UserData?.PlaybackPositionTicks
                                            ? item.RunTimeTicks - item.UserData.PlaybackPositionTicks
                                            : 0;
                                        const minsLeft = ticksLeft > 0 ? Math.round(ticksLeft / 600000000) : 0;

                                        return (
                                            <div
                                                key={item.Id}
                                                className="backdrop-card"
                                                onClick={() => {
                                                    if (item.Type === 'Movie') {
                                                        navigate(`/movie/${item.Id}`, { state: { autoplay: true } });
                                                    } else {
                                                        navigate(`/play/${item.Id}`);
                                                    }
                                                }}
                                                onContextMenu={(e) => handleContextMenu(e, item)}
                                                title={`Resume: ${item.Name}`}
                                            >
                                                <div className="backdrop-card-image">
                                                    <img
                                                        src={`${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?maxWidth=500&quality=90`}
                                                        alt={item.Name}
                                                        draggable={false}
                                                        onError={(e) => { e.target.src = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?maxWidth=500`; }}
                                                    />
                                                    {/* Play Overlay */}
                                                    <div className="backdrop-play-overlay is-resume">
                                                        <span className="material-icons" style={{ fontSize: '32px' }}>play_arrow</span>
                                                    </div>
                                                    {/* Time-Left or Watched Badge */}
                                                    {played ? (
                                                        <div className="backdrop-badge watched">Watched</div>
                                                    ) : minsLeft > 0 ? (
                                                        <div className="backdrop-badge time-left">{minsLeft}m left</div>
                                                    ) : null}
                                                </div>
                                                {/* Progress Bar */}
                                                {item.UserData && item.RunTimeTicks > 0 && !played && (
                                                    <div className="backdrop-progress-track">
                                                        <div className="backdrop-progress-fill" style={{ width: `${Math.min(100, (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100)}%` }}></div>
                                                    </div>
                                                )}
                                                <div className="backdrop-card-info">
                                                    <span className="backdrop-card-series">{item.SeriesName || ''}</span>
                                                    <span className="backdrop-card-title">
                                                        {item.SeriesName
                                                            ? (item.ParentIndexNumber != null && item.IndexNumber != null
                                                                ? `S${item.ParentIndexNumber} E${item.IndexNumber} – ${item.Name}`
                                                                : item.Name)
                                                            : item.Name}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </DraggableRow>
                            </section>
                        )}

                        {/* 2.5. History */}
                        {historyItems.length > 0 && (
                            <section className="home-section" style={{ paddingLeft: '4%', paddingRight: '4%', marginBottom: '40px' }}>
                                <h2 className="section-title" style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '15px', color: '#cacaca' }}>History</h2>
                                <DraggableRow className="backdrop-scroll-container">
                                    {historyItems.map(item => (
                                        <div
                                            key={item.Id}
                                            className="backdrop-card"
                                            onClick={() => navigate(`/item/${item.Id}`)}
                                            onContextMenu={(e) => handleContextMenu(e, item)}
                                            title={item.Name}
                                        >
                                            <div className="backdrop-card-image">
                                                <img
                                                    src={`${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?maxWidth=500&quality=90`}
                                                    alt={item.Name}
                                                    draggable={false}
                                                    onError={(e) => { e.target.src = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?maxWidth=500`; }}
                                                />
                                                <div className="backdrop-play-overlay is-history">
                                                    <span className="material-icons" style={{ fontSize: '28px' }}>replay</span>
                                                </div>
                                            </div>
                                            <div className="backdrop-card-info">
                                                <span className="backdrop-card-series">{item.SeriesName || ''}</span>
                                                <span className="backdrop-card-title">
                                                    {item.SeriesName
                                                        ? (item.ParentIndexNumber != null && item.IndexNumber != null
                                                            ? `S${item.ParentIndexNumber} E${item.IndexNumber} – ${item.Name}`
                                                            : item.Name)
                                                        : item.Name}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </DraggableRow>
                            </section>
                        )}

                        {/* Promo Banners */}
                        {promoItems.length > 0 && (
                            <section className="home-section" style={{ paddingLeft: '4%', paddingRight: '4%', marginBottom: '50px' }}>
                                <div className="promo2-wrapper">
                                    {/* ── Hero Banner (Item 1) ── */}
                                    <div className="promo2-hero"
                                        onClick={() => navigate(`/item/${promoItems[0].Id}`)}
                                        onContextMenu={(e) => handleContextMenu(e, promoItems[0])}
                                    >
                                        <img
                                            src={`${jellyfinService.api.basePath}/Items/${promoItems[0].Id}/Images/Backdrop/0?maxWidth=1400&quality=90`}
                                            className="promo2-hero-img"
                                            alt={promoItems[0].Name}
                                        />
                                        <div className="promo2-hero-gradient" />
                                        <div className="promo2-hero-content">
                                            {promoItems[0].ImageTags?.Logo ? (
                                                <img
                                                    src={`${jellyfinService.api.basePath}/Items/${promoItems[0].Id}/Images/Logo/0?maxWidth=350&quality=90`}
                                                    className="promo2-hero-logo"
                                                    alt={promoItems[0].Name}
                                                />
                                            ) : (
                                                <h2 className="promo2-hero-title">{promoItems[0].Name}</h2>
                                            )}
                                            <div className="promo2-meta-line">
                                                <span className="promo2-badge">{promoItems[0].OfficialRating || '13+'}</span>
                                                {promoItems[0].ProductionYear && (
                                                    <>
                                                        <span className="promo2-meta-dot">•</span>
                                                        <span className="promo2-meta-text">{promoItems[0].ProductionYear}</span>
                                                    </>
                                                )}
                                                {promoItems[0].Genres && promoItems[0].Genres.length > 0 && (
                                                    <>
                                                        <span className="promo2-meta-dot">•</span>
                                                        <span className="promo2-meta-text">{promoItems[0].Genres.slice(0, 3).join(', ')}</span>
                                                    </>
                                                )}
                                                {promoItems[0].CommunityRating && (
                                                    <>
                                                        <span className="promo2-meta-dot">•</span>
                                                        <span className="promo2-meta-text">⭐ {promoItems[0].CommunityRating.toFixed(1)}</span>
                                                    </>
                                                )}
                                            </div>
                                            {promoItems[0].Overview && (
                                                <p className="promo2-hero-desc">{promoItems[0].Overview}</p>
                                            )}
                                            <Button
                                                variant="ringHover"
                                                size="lg"
                                                className="promo2-btn"
                                                onClick={(e) => { e.stopPropagation(); navigate(`/item/${promoItems[0].Id}`); }}
                                            >
                                                WATCH NOW
                                            </Button>
                                        </div>
                                    </div>

                                    {/* ── Two Small Cards (Items 2 & 3) ── */}
                                    {(promoItems[1] || promoItems[2]) && (
                                        <div className="promo2-row">
                                            {promoItems.slice(1, 3).map(item => (
                                                <div
                                                    key={item.Id}
                                                    className="promo2-card"
                                                    onClick={() => navigate(`/item/${item.Id}`)}
                                                    onContextMenu={(e) => handleContextMenu(e, item)}
                                                >
                                                    <div className="promo2-card-text">
                                                        {item.ImageTags?.Logo ? (
                                                            <img
                                                                src={`${jellyfinService.api.basePath}/Items/${item.Id}/Images/Logo/0?maxWidth=220&quality=90`}
                                                                className="promo2-card-logo"
                                                                alt={item.Name}
                                                            />
                                                        ) : (
                                                            <h3 className="promo2-card-title">{item.Name}</h3>
                                                        )}
                                                        <div className="promo2-meta-line promo2-meta-line--card">
                                                            <span className="promo2-badge">{item.OfficialRating || '13+'}</span>
                                                            {item.ProductionYear && (
                                                                <>
                                                                    <span className="promo2-meta-dot">•</span>
                                                                    <span className="promo2-meta-text">{item.ProductionYear}</span>
                                                                </>
                                                            )}
                                                            {item.Genres && item.Genres.length > 0 && (
                                                                <>
                                                                    <span className="promo2-meta-dot">•</span>
                                                                    <span className="promo2-meta-text">{item.Genres.slice(0, 2).join(', ')}</span>
                                                                </>
                                                            )}
                                                            {item.CommunityRating && (
                                                                <>
                                                                    <span className="promo2-meta-dot">•</span>
                                                                    <span className="promo2-meta-text">⭐ {item.CommunityRating.toFixed(1)}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <p className="promo2-card-desc">{item.Overview}</p>
                                                        <Button
                                                            variant="ringHover"
                                                            className="promo2-btn"
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/item/${item.Id}`); }}
                                                        >
                                                            START WATCHING
                                                        </Button>
                                                    </div>
                                                    <div className="promo2-card-img">
                                                        <img
                                                            src={`${jellyfinService.api.basePath}/Items/${item.Id}/Images/Backdrop/0?maxWidth=500&quality=90`}
                                                            alt={item.Name}
                                                            onError={(e) => { e.target.src = `${jellyfinService.api.basePath}/Items/${item.Id}/Images/Primary?maxWidth=400`; }}
                                                            draggable={false}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* 3. Media Rows (Latest per Library) */}
                        {libraries.map(lib => (
                            <MediaRow
                                key={lib.Id}
                                title={`Latest ${lib.Name}`}
                                libraryId={lib.Id}
                                onCardClick={(item) => navigate(`/item/${item.Id}`)}
                                onContextMenu={(e, item) => handleContextMenu(e, item)}
                            />
                        ))}

                        <Footer />
                    </>
                )}
            </div>

            <InfoModal
                itemId={modalItem}
                isOpen={!!modalItem}
                onClose={closeModal}
            />

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    options={getContextMenuOptions(contextMenu.item)}
                    onClose={closeContextMenu}
                />
            )}
        </div>
    );
};

export default Home;
