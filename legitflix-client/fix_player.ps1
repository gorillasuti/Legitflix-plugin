$path = "C:/Users/DaniPC/Desktop/Git repos/Legitflix-plugin/legitflix-client/src/pages/Player/Player.jsx"
$lines = Get-Content $path

# Helper to join lines
function Join-Lines($l) {
    if ($l -eq $null) { return "" }
    return $l -join "`r`n"
}

# 1-based indices mapped to 0-based array:
# 1..51 -> 0..50
$part1 = $lines[0..50]

# Skip 52 (config)

# 53..506 -> 52..505
$part2 = $lines[52..505]

# Skip 507..540 (duplicates)

# 541..657 -> 540..656
$part3 = $lines[540..656]

# Skip 658 (showSkipIntro)

# 659..1017 -> 658..1016
$part4 = $lines[658..1016]

$fixBlock = @"
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

# 1149..1245 -> 1148..1244 (Metadata section)
$part5 = $lines[1148..1244]

$endBlock = @"
                    )
                }
            </div>
        );
    };

    export default Player;
"@

$newContent = (Join-Lines $part1) + "`r`n" + 
(Join-Lines $part2) + "`r`n" + 
(Join-Lines $part3) + "`r`n" + 
(Join-Lines $part4) + "`r`n" + 
$fixBlock + "`r`n" + 
(Join-Lines $part5) + "`r`n" + 
$endBlock

Set-Content -Path $path -Value $newContent -Encoding UTF8
Write-Host "Fixed Player.jsx"
