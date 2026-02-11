$h = (Get-FileHash -Path "LegitFlix.Plugin_1.0.0.33.zip" -Algorithm MD5).Hash.ToLower()
Write-Host "CHECKSUM=$h"
