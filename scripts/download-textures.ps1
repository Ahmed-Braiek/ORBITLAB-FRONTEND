$ErrorActionPreference = "Stop"
$folder = Join-Path $PSScriptRoot "..\public\textures"
New-Item -ItemType Directory -Force -Path $folder | Out-Null
$base = "https://www.solarsystemscope.com/textures/download"
$maps = @{
  "mercury.jpg" = "2k_mercury.jpg";"venus.jpg" = "2k_venus_atmosphere.jpg";
  "earth.jpg" = "2k_earth_daymap.jpg";"earth-clouds.jpg" = "2k_earth_clouds.jpg";
  "mars.jpg" = "2k_mars.jpg";"jupiter.jpg" = "2k_jupiter.jpg";
  "saturn.jpg" = "2k_saturn.jpg";"uranus.jpg" = "2k_uranus.jpg";
  "neptune.jpg" = "2k_neptune.jpg"
}
foreach($entry in $maps.GetEnumerator()){
  $dest = Join-Path $folder $entry.Key
  if((Test-Path $dest) -and ((Get-Item $dest).Length -gt 50000)){continue}
  Write-Host "Downloading $($entry.Key)"
  try {
    Invoke-WebRequest -Uri "$base/$($entry.Value)" -OutFile $dest -MaximumRedirection 5
    if((Get-Item $dest).Length -lt 50000){throw "Incomplete download"}
  } catch {
    Remove-Item $dest -ErrorAction SilentlyContinue
    Write-Warning "Could not download $($entry.Value). Download manually from https://www.solarsystemscope.com/textures/"
  }
}
Write-Host "Finished. Restart npm start to load local maps."
