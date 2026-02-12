$path = "C:/Users/DaniPC/Desktop/Git repos/Legitflix-plugin/legitflix-client/src/pages/Player/Player.jsx"
$lines = Get-Content $path

# Locate Start Cut
$idxGeneral = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "settingsTab === 'General'") {
        $idxGeneral = $i
        break
    }
}

if ($idxGeneral -eq -1) {
    Write-Host "Could not find General tab"
    exit 1
}

# Find the button start after General
$idxButton = -1
for ($i = $idxGeneral; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "<button") {
        $idxButton = $i
        break
    }
}

# Find the className autoPlay line
$idxCut = -1
for ($i = $idxButton; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "className=\{autoPlay") {
        $idxCut = $i
        break
    }
}

if ($idxCut -eq -1) {
    Write-Host "Could not find autoPlay class line"
    exit 1
}

# Locate Content Container Start
$idxContentStart = -1
for ($i = $idxCut; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '<div className="lf-player-content-container">') {
        $idxContentStart = $i
        break
    }
}

if ($idxContentStart -eq -1) {
    Write-Host "Could not find content container"
    exit 1
}

# Locate Content Container End (matching indentation)
# The start line has specific indentation. We look for </div> with same indentation.
$startLineStr = $lines[$idxContentStart]
$indent = $startLineStr.Substring(0, $startLineStr.IndexOf("<"))

$idxContentEnd = -1
for ($i = $idxContentStart + 1; $i -lt $lines.Count; $i++) {
    if ($lines[$i].StartsWith($indent + "</div>") -or $lines[$i].Trim() -eq "</div>") {
        # Check explicit match if possible, or just assume the first matching indent closing tag
        # Step 33 showed 1211 closing 1115. Intermediate keys are indented further.
        if ($lines[$i] -match "^\s*</div>\s*$") {
            # Verify it's not inner div. Inner divs would be indented more.
            # We assume consistent indentation.
            if ($lines[$i].Length -eq $indent.Length + 6) {
                $idxContentEnd = $i
            }
        }
    }
    # Stop if we found it and passed it? 
    # Actually, we want the LAST one? No, the first one at this level.
    if ($idxContentEnd -ne -1) { break }
}

if ($idxContentEnd -eq -1) {
    Write-Host "Could not find content container end"
    # Fallback to scanning from bottom? No, simpler to just take a large enough chunk?
    # Or just use the known index relative to file end?
    # File ends with ); }; export default Player;
    # So 3 lines from bottom is );
    # 4 lines is </div > (page).
    # 5 lines is ) (item check).
    # 6 lines is } (item check).
    # 7 lines is </div> (content container).
    
    # We can work backwards.
    # But let's trust the logic or manual override if fails.
    exit 1
}

Write-Host "Cut at $idxCut"
Write-Host "Resume at $idxContentStart"
Write-Host "End Content at $idxContentEnd"

# Helpers
function Join-Lines($l) { return $l -join "`r`n" }

# Part 1: Start to Cut (Inclusive of cut line? No, cut line is className=...)
# We want to keep <button and className=...
# My FixBlock handles the closing of the button.
# So we include $lines[0..$idxCut]
$part1 = $lines[0..$idxCut]

$midBlock = @"
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
"@

# Part 2: Content
$part2 = $lines[$idxContentStart..$idxContentEnd]

$endBlock = @"
                    )
                }
            </div>
        );
    };

    export default Player;
"@

$newContent = (Join-Lines $part1) + "`r`n" + $midBlock + "`r`n" + (Join-Lines $part2) + "`r`n" + $endBlock
Set-Content -Path $path -Value $newContent -Encoding UTF8
Write-Host "Fixed Player.jsx Dynamically"
