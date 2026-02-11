$sourceDir = "c:\Users\DaniPC\Desktop\Git repos\Legitflix-plugin\LegitFlix.Plugin\Assets\Client\images"
$destDir = "c:\Users\DaniPC\Desktop\Git repos\Legitflix-plugin\legitflix-client\public\avatars"
$jsonFile = "c:\Users\DaniPC\Desktop\Git repos\Legitflix-plugin\legitflix-client\src\config\avatars.json"
$configDir = "c:\Users\DaniPC\Desktop\Git repos\Legitflix-plugin\legitflix-client\src\config"

# Ensure directories exist
if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Force -Path $destDir }
if (!(Test-Path $configDir)) { New-Item -ItemType Directory -Force -Path $configDir }

# Copy images
Write-Host "Copying avatars..."
Copy-Item -Path "$sourceDir\*" -Destination $destDir -Recurse -Force

# Generate JSON
Write-Host "Generating manifest..."
$categories = Get-ChildItem -Path $destDir -Directory
$avatarData = @{}

foreach ($cat in $categories) {
    $files = Get-ChildItem -Path $cat.FullName -File | Select-Object -ExpandProperty Name
    $avatarData[$cat.Name] = $files
}

$jsonContent = $avatarData | ConvertTo-Json -Depth 3
Set-Content -Path $jsonFile -Value $jsonContent

Write-Host "Done! Manifest saved to $jsonFile"
