$version = "1.0.0.3"
$dllName = "LegitFlix.Plugin.dll"
$zipName = "LegitFlix.Plugin_${version}.zip"
$buildDir = "bin\Release\net9.0"
$publishDir = "publish"

# 1. Build
Write-Host "Building Plugin..."
dotnet build -c Release

# 2. Prepare Zip
if (Test-Path $publishDir) { Remove-Item $publishDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $publishDir | Out-Null

# Verify build output first
if (-not (Test-Path "$buildDir\$dllName")) {
    Write-Error "Build failed: DLL not found at $buildDir\$dllName"
    exit 1
}

Copy-Item "$buildDir\$dllName" -Destination $publishDir
Write-Host "Copied $dllName to $publishDir"

# Include meta.json if it exists
if (Test-Path "$buildDir\meta.json") {
    Copy-Item "$buildDir\meta.json" -Destination $publishDir
    Write-Host "Copied meta.json to $publishDir"
}

# 3. Zip
Write-Host "Zipping artifacts..."
$zipPath = "$PWD\$zipName"
if (Test-Path $zipPath) { Remove-Item $zipPath }
Compress-Archive -Path "$publishDir\*" -DestinationPath $zipPath

# 4. Checksum
$hash = Get-FileHash -Path $zipPath -Algorithm MD5
$checksum = $hash.Hash.ToLower()

# 5. Generate Manifest Snippet
$manifest = @{
    guid        = "a1b2c3d4-e5f6-7890-1234-567890abcdef"
    name        = "LegitFlix UI"
    description = "Total UI replacement for Jellyfin."
    overview    = "A complete overhaul of the Jellyfin web interface."
    owner       = "LegitFlix"
    category    = "User Interface"
    imageUrl    = "https://raw.githubusercontent.com/jellyfin/jellyfin/master/Jellyfin.Server/Resources/Images/JellyfinLogo.png"
    versions    = @(
        @{
            version   = $version
            changelog = "Initial Release"
            targetAbi = "10.8.13.0"
            sourceUrl = "https://github.com/YOUR_USER/YOUR_REPO/releases/download/v$version/$zipName"
            checksum  = $checksum
            timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
        }
    )
}

$json = ConvertTo-Json $manifest -Depth 10

Write-Host "---------------------------------------------------"
Write-Host "PACKAGE COMPLETE: $zipName"
Write-Host "MD5 Checksum: $checksum"
Write-Host "---------------------------------------------------"
Write-Host "Paste this into your repository manifest.json:"
Write-Host $json
Write-Host "---------------------------------------------------"
$json | Out-File "manifest_snippet.json"
