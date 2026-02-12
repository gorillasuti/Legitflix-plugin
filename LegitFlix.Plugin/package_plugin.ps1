$version = "1.0.0.53"
$dllName = "LegitFlix.Plugin.dll"
$zipName = "LegitFlix.Plugin_${version}.zip"
# Adjust build dir to be relative to the script location if running from root
$projectDir = $PSScriptRoot
$itemDir = "$projectDir\.."
$clientDir = Join-Path $itemDir "legitflix-client"

$buildDir = Join-Path $projectDir "bin\Release\net9.0"
$publishDir = Join-Path $projectDir "publish"

# 0. Build React App
Write-Host "Building React Client..."
Set-Location $clientDir
npm install
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "React build failed!"
    exit 1
}

# Copy Build Artifacts to Plugin Assets
# Vite handles output to Assets/Client directly via vite.config.js
# No manual copy needed here

# Return to project dir
Set-Location $projectDir

# 1. Build Plugin
Write-Host "Building Plugin..."
# Ensure we build the specific project
dotnet build "$projectDir\LegitFlix.Plugin.csproj" -c Release

# 2. Prepare Zip
if (Test-Path $publishDir) { Remove-Item $publishDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path $publishDir | Out-Null

# Verify build output first
# if (-not (Test-Path "$buildDir\$dllName")) {
#     Write-Error "Build failed: DLL not found at $buildDir\$dllName"
#     exit 1
# }

Copy-Item "$buildDir\$dllName" -Destination $publishDir
Write-Host "Copied $dllName to $publishDir"

# Include meta.json if it exists
if (Test-Path "$buildDir\meta.json") {
    Copy-Item "$buildDir\meta.json" -Destination $publishDir
    Write-Host "Copied meta.json to $publishDir"
}

# 3. Zip
Start-Sleep -Seconds 2 # Wait for file handles to close
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
    imageUrl    = "https://raw.githubusercontent.com/gorillasuti/Legitflix-plugin/refs/heads/main/legitflix-client/public/default-logo-blue.png"
    versions    = @(
        @{
            version   = $version
            changelog = "Promo Banner Rework (Legacy Parity), Button Component Integration, UI Cleanup."
            targetAbi = "10.11.5.0"
            sourceUrl = "https://github.com/gorillasuti/Legitflix-plugin/releases/download/v$version/$zipName"
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
