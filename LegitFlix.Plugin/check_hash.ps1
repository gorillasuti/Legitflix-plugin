$c = (Get-Content checksum.txt -Raw).Trim()
Write-Host "LEN:$($c.Length)"
Write-Host "CONTENT:$c"
