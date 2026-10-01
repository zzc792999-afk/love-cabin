# Git push script for Love Cabin
Set-Location $PSScriptRoot
Write-Host "============================================="
Write-Host "      Love Cabin Deploy Helper Tool"
Write-Host "============================================="

# 1. Check Git
$gitCheck = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCheck) {
    # Check standard install locations first
    $standardGit = @(
        "C:\Program Files\Git\cmd\git.exe",
        "C:\Program Files\Git\bin\git.exe",
        "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
    ) | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($standardGit) {
        $gitDir = Split-Path $standardGit
        $env:Path = "$gitDir;$env:Path"
        Write-Host "Found Git at $standardGit"
    } else {
        Write-Host "Git is not installed yet. Preparing installer..."
        $cachedInstaller = "$env:LOCALAPPDATA\Temp\WinGet\Git.Git.2.55.0.5\Git-2.55.0.5-64-bit.exe"
        $installerPath = $null

        if (Test-Path $cachedInstaller) {
            Write-Host "Found pre-downloaded Git installer! Installing (takes 20-30 seconds)..."
            $installerPath = $cachedInstaller
        } else {
            Write-Host "Downloading Git installer..."
            $downloadUrl = "https://github.com/git-for-windows/git/releases/download/v2.41.0.windows.1/Git-2.41.0-64-bit.exe"
            $installerPath = Join-Path $PSScriptRoot "git_setup.exe"
            try {
                [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
                Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UserAgent "Mozilla/5.0"
            } catch {
                Write-Host "Error downloading Git: $_"
                Write-Host "Please download Git manually from: https://git-scm.com/"
                Exit
            }
        }

        try {
            $installProcess = Start-Process -FilePath $installerPath -ArgumentList "/VERYSILENT /NORESTART /NOCANCEL" -Verb RunAs -Wait -PassThru
            if ($installProcess.ExitCode -eq 0 -or (Test-Path "C:\Program Files\Git\cmd\git.exe")) {
                Write-Host "Git installed successfully!"
                $env:Path = "C:\Program Files\Git\cmd;C:\Program Files\Git\bin;$env:Path"
            } else {
                Write-Host "Failed to install Git. Please run installer manually."
                Exit
            }
        } finally {
            if ($installerPath -and $installerPath -ne $cachedInstaller -and (Test-Path $installerPath)) {
                Remove-Item $installerPath -Force -ErrorAction SilentlyContinue
            }
        }
    }
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
git commit -m "feat: simplify cabin interface and streamline navigation"

# 3. Get repository URL
$defaultRepo = "https://github.com/zzc792999-afk/love-cabin.git"
Write-Host ""
Write-Host "---------------------------------------------"
Write-Host "Target GitHub Repository: $defaultRepo"
$inputUrl = Read-Host "Press Enter to use this repository, or paste another URL"
if ([string]::IsNullOrWhiteSpace($inputUrl)) {
    $repoUrl = $defaultRepo
} else {
    $repoUrl = $inputUrl
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
    Write-Host " Vercel will automatically redeploy at:"
    Write-Host " https://love-zpp.vercel.app"
    Write-Host "============================================="
} else {
    Write-Host "Push failed. Please check your network and account."
}

Read-Host "Press Enter to exit..."
