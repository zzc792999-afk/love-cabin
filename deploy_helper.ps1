# Git push script for Love Cabin
Write-Host "============================================="
Write-Host "      Love Cabin Deploy Helper Tool"
Write-Host "============================================="

# 1. Check Git
$gitCheck = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCheck) {
    Write-Host "Git is not installed. Downloading Git..."
    $downloadUrl = "https://github.com/git-for-windows/git/releases/download/v2.41.0.windows.1/Git-2.41.0-64-bit.exe"
    $installerPath = Join-Path $PSScriptRoot "git_setup.exe"
    
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UserAgent "Mozilla/5.0"
        Write-Host "Downloading finished. Installing Git (takes 30 seconds)..."
        
        $installProcess = Start-Process -FilePath $installerPath -ArgumentList "/VERYSILENT /NORESTART /NOCANCEL" -Wait -PassThru
        if ($installProcess.ExitCode -eq 0) {
            Write-Host "Git installed successfully!"
        } else {
            Write-Host "Failed to install Git. Exit code: $($installProcess.ExitCode)"
            Exit
        }
    } catch {
        Write-Host "Error downloading Git: $_"
        Write-Host "Please download Git manually from: https://git-scm.com/"
        Exit
    } finally {
        if (Test-Path $installerPath) {
            Remove-Item $installerPath -Force
        }
    }
    
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "Git is ready."
}

# 2. Reset and Init git
Write-Host "[1/3] Resetting and Initializing local git repository..."
if (Test-Path (Join-Path $PSScriptRoot ".git")) {
    # Remove read-only attributes from all files inside .git to allow deletion in Windows
    Get-ChildItem -Path (Join-Path $PSScriptRoot ".git") -Recurse -Force | ForEach-Object {
        if ($_.IsReadOnly) { $_.IsReadOnly = $false }
    }
    Remove-Item -Path (Join-Path $PSScriptRoot ".git") -Force -Recurse
}

# Create .gitignore BEFORE first git add to ensure large file is never tracked
$gitignorePath = Join-Path $PSScriptRoot ".gitignore"
if (-not (Test-Path $gitignorePath)) {
    "node_modules/`r`n.DS_Store`r`n*.log`r`n/music.mp3" | Out-File -FilePath $gitignorePath -Encoding ascii
} else {
    $gitContent = Get-Content $gitignorePath
    if ($gitContent -notcontains "/music.mp3") {
        "`r`n/music.mp3" | Out-File -FilePath $gitignorePath -Append -Encoding ascii
    }
}

# Init new clean repository
git init

# Ensure git user config exists to prevent commit failure
$gitName = git config --global --get user.name
if ([string]::IsNullOrWhiteSpace($gitName)) {
    git config --global user.name "Zuzhe"
}
$gitEmail = git config --global --get user.email
if ([string]::IsNullOrWhiteSpace($gitEmail)) {
    git config --global user.email "zuzhe@lovecabin.com"
}

git add .
git commit -m "feat: deploy server without large files"

# 3. Get repository URL
Write-Host ""
Write-Host "---------------------------------------------"
Write-Host "Please create a new repository on GitHub first."
Write-Host "Copy the repo link (e.g. https://github.com/user/repo.git) and paste it below:"
$repoUrl = Read-Host "GitHub Repo URL"
if ([string]::IsNullOrWhiteSpace($repoUrl)) {
    Write-Host "URL cannot be empty. Stopped."
    Exit
}

# 4. Push
git remote remove origin 2>$null
git remote add origin $repoUrl
git branch -M main

Write-Host ""
Write-Host "[3/3] Uploading code to GitHub..."
Write-Host "If this is your first time, a login window will pop up. Please authorize the login."
git push -u origin main -f

if ($LASTEXITCODE -eq 0) {
    Write-Host "============================================="
    Write-Host " Success! Code pushed to GitHub successfully!"
    Write-Host "============================================="
    Write-Host "Next, go to Render.com and connect this repo."
    Write-Host "See deployment_guide.md for detailed steps."
} else {
    Write-Host "Push failed. Please check your network and account."
}

Read-Host "Press Enter to exit..."
