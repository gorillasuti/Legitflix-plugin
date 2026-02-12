$path = "C:/Users/DaniPC/Desktop/Git repos/Legitflix-plugin/legitflix-client/src/pages/Player/Player.jsx"
$lines = Get-Content $path

# 1. Locate Cut 1: The broken General tab button
$idxGeneral = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "settingsTab === 'General'") {
        $idxGeneral = $i
        break
    }
}

if ($idxGeneral -eq -1) { Write-Host "Could not find General tab"; exit 1 }

$idxCut1 = -1
for ($i = $idxGeneral; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "className=\{autoPlay") {
        # We want to keep the line BEFORE this (the <button line)?
        # Or if the <button line is separate.
        # Searching backwards for <button?
        # Actually, let's just find "settingsTab === 'General'" and assume the button follows.
        # Step 45 shows:
        # 980: className="lf-player-skip-btn" ... Wait, this is garbage.
        # We want the FIRST autoPlay occurrence?
        # The garbage button (982 in Step 54) has `onClick={() => setAutoPlay(!autoPlay)}`.
        # The ORIGINAL button (from valid code) had `className={autoPlay ? 'active' : ''}`.
        
        if ($lines[$i] -match "className=\{autoPlay") {
            # Verify it's not the fix block I inserted?
            # My fix block has `Auto Play: {autoPlay`.
            # The class line is `className={autoPlay ? 'active' : ''}`.
            # So look for that specific string.
            $idxCut1 = $i
            break
        }
    }
}

if ($idxCut1 -eq -1) { Write-Host "Could not find autoPlay class"; exit 1 }

# $idxCut1 is the line with className. We want to cut BEFORE it?
# We want to replace valid file's <button ... up to there.
# But getting the start of the button is tricky if it's on previous line.
# Let's search back for <button from $idxCut1.
$idxButtonStart = -1
for ($i = $idxCut1; $i -ge 0; $i--) {
    if ($lines[$i] -match "<button") {
        $idxButtonStart = $i
        break
    }
}

if ($idxButtonStart -eq -1) { Write-Host "Could not find button start"; exit 1 }

# 2. Locate Cut 2: item.PremiereDate
$idxCut2 = -1
for ($i = $idxButtonStart; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "item\.PremiereDate &&") {
        $idxCut2 = $i
        break
    }
}

if ($idxCut2 -eq -1) { Write-Host "Could not find PremiereDate"; exit 1 }


# Construct Parts
# Part 1: Everything up to button start
$part1 = $lines[0..($idxButtonStart - 1)]

# The Fix + Header Block
$fixAndHeader = @"
                                            <button
                                                className={autoPlay ? 'active' : ''}
                                                onClick={() => setAutoPlay(!autoPlay)}
                                            >
                                                Auto Play: {autoPlay ? 'On' : 'Off'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Content Below Player --- */}
            {
                item && item.Type === 'Episode' && (
                    <div className="lf-player-content-container">

                        {/* Left Column: Metadata */}
                        <div className="lf-player-column-left">
                            <div className="lf-player-header-row">
                                <div className="lf-player-title-block">
                                    <h4
                                        className="lf-series-link"
                                        onClick={() => navigate(`/series/${item.SeriesId}`)}
                                    >
                                        {item.SeriesName}
                                    </h4>
                                    <h1 className="lf-episode-name">
                                        E{item.IndexNumber} - {item.Name}
                                    </h1>
                                </div>
                                <div className="lf-player-actions">
                                    <button
                                        className={`lf-action-btn ${isFavorite ? 'is-active' : ''}`}
                                        onClick={toggleFavorite}
                                        title={isFavorite ? "Remove from Watchlist" : "Add to Watchlist"}
                                    >
                                        <span className="material-icons">
                                            {isFavorite ? 'bookmark' : 'bookmark_border'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="lf-player-tags-row">
                                {item.OfficialRating && (
                                    <span className="lf-tag-rating">{item.OfficialRating}</span>
                                )}
                                <span className="lf-tag-text">Sub | Dub</span>
"@

# Part 2: From PremiereDate to end
$part2 = $lines[$idxCut2..($lines.Count - 1)]

function Join-Lines($l) { return $l -join "`r`n" }

$newContent = (Join-Lines $part1) + "`r`n" + $fixAndHeader + "`r`n" + (Join-Lines $part2)
Set-Content -Path $path -Value $newContent -Encoding UTF8
Write-Host "Restored Player.jsx"
