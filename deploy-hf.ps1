# Deploy ClearVoice AI to Hugging Face Spaces (permanent URL)
#
# 1) Create a free token: https://huggingface.co/settings/tokens  (Write access)
# 2) In PowerShell:
#      hf auth login
#    or:
#      $env:HF_TOKEN = "hf_xxxxxxxx"
# 3) Run:
#      powershell -ExecutionPolicy Bypass -File .\deploy-hf.ps1

$ErrorActionPreference = "Stop"
$SpaceId = if ($env:HF_SPACE_ID) { $env:HF_SPACE_ID } else { "Abdulsametklc/ClearVoice-AI" }
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "Deploying to Hugging Face Space: $SpaceId" -ForegroundColor Cyan

# Ensure logged in
try {
  hf auth whoami | Out-Host
} catch {
  if (-not $env:HF_TOKEN) {
    Write-Host "Not logged in. Run: hf auth login" -ForegroundColor Yellow
    throw
  }
}

# Create space if missing (ignore error if exists)
hf repo create $SpaceId --type space --space_sdk docker 2>$null

# Upload project files for Docker Space
$tmp = Join-Path $env:TEMP ("clearvoice_space_" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null

Copy-Item Dockerfile, api.py, cleaner.py, requirements-docker.txt, .dockerignore -Destination $tmp
Copy-Item -Recurse frontend -Destination (Join-Path $tmp "frontend")
# HF Space README with YAML frontmatter
Copy-Item README_SPACE.md (Join-Path $tmp "README.md")

# Remove heavy / unnecessary frontend bits already excluded by dockerignore locally
Remove-Item -Recurse -Force (Join-Path $tmp "frontend\node_modules") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $tmp "frontend\dist") -ErrorAction SilentlyContinue

hf upload $SpaceId $tmp . --repo-type space

Remove-Item -Recurse -Force $tmp

Write-Host ""
Write-Host "Done. Space URL:" -ForegroundColor Green
Write-Host "https://huggingface.co/spaces/$SpaceId"
Write-Host "Public app (after build):"
Write-Host "https://$($SpaceId.Replace('/','-')).hf.space"
