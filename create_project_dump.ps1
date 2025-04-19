# PowerShell Script to Consolidate Project Files into One Text File

# --- Configuration ---
$projectBasePath = "C:\Users\jeyar\Documents\BCA\Internship\mpl-project" # ADJUST IF NEEDED
$outputFileName = "project_dump.txt"
$outputFilePath = Join-Path -Path $projectBasePath -ChildPath $outputFileName

# Folders to process (in order)
$foldersToProcess = @(
    "mpl-backend",
    "mpl-frontend"
)

# File extensions to include
$includeExtensions = @(
    ".js",
    ".jsx",
    ".json",
    ".css",
    ".html",
    ".env",         # Include actual .env file
    ".env.example",
    ".sql",         # Include schema file if present
    ".md"           # Include README etc.
    # Add other extensions if needed (e.g., .ts, .tsx, .scss)
)

# Folders/Directories to EXCLUDE completely
$excludeFolders = @(
    "node_modules",
    ".git",
    "dist", # Common build output folder for frontend
    "build" # Another common build output folder
    # Add other folders like '.vscode', '.idea' if desired
)

# --- Script Start ---
Write-Host "Starting project file consolidation..."
Write-Host "Base Path: $projectBasePath"
Write-Host "Output File: $outputFilePath"

# Check if base path exists
if (-not (Test-Path -Path $projectBasePath -PathType Container)) {
    Write-Error "Error: Project base path '$projectBasePath' not found. Please correct the path."
    Exit 1
}

# Delete existing output file to start fresh
if (Test-Path -Path $outputFilePath) {
    Write-Warning "Output file '$outputFilePath' already exists. Deleting it."
    Remove-Item -Path $outputFilePath -Force
}

# Create an empty output file
New-Item -ItemType File -Path $outputFilePath | Out-Null
Write-Host "Created empty output file."

# Iterate through the specified folders
foreach ($folderName in $foldersToProcess) {
    $currentFolderPath = Join-Path -Path $projectBasePath -ChildPath $folderName
    Write-Host "Processing folder: $folderName..."

    # Check if subfolder exists
    if (-not (Test-Path -Path $currentFolderPath -PathType Container)) {
        Write-Warning "Warning: Folder '$currentFolderPath' not found. Skipping."
        continue
    }

    # Get files recursively, excluding specified folders and including specified extensions
    try {
        Get-ChildItem -Path $currentFolderPath -Recurse -File | Where-Object {
            # Check if the file's full path contains any of the exclude folder names
            $shouldExclude = $false
            foreach ($excludeDir in $excludeFolders) {
                # Need to handle path separators carefully
                if ($_.FullName -like "*$([System.IO.Path]::DirectorySeparatorChar)$excludeDir$([System.IO.Path]::DirectorySeparatorChar)*" -or $_.FullName -like "*$([System.IO.Path]::DirectorySeparatorChar)$excludeDir") {
                    $shouldExclude = $true
                    break
                }
            }
            (-not $shouldExclude) -and ($includeExtensions -contains $_.Extension)
        } | ForEach-Object {
            $file = $_
            $relativePath = $file.FullName.Substring($projectBasePath.Length).TrimStart("\/") # Get path relative to base project folder
            Write-Host "  Adding: $relativePath"

            # Create header
            $header = "`n--- File: $relativePath ---`n`n" # Add newlines for spacing

            # Get content - Use -Raw for single string, handle potential errors reading file
            try {
                $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
            } catch {
                Write-Warning "  Warning: Could not read content from '$relativePath'. Error: $($_.Exception.Message)"
                $content = "[Error reading file content]"
            }

            # Append header and content to the output file (ensure UTF8 encoding)
            Add-Content -Path $outputFilePath -Value $header -Encoding UTF8
            Add-Content -Path $outputFilePath -Value $content -Encoding UTF8
            Add-Content -Path $outputFilePath -Value "`n`n" -Encoding UTF8 # Add separator
        }
    } catch {
         Write-Error "An error occurred while processing files in '$currentFolderPath': $($_.Exception.Message)"
    }
}

Write-Host "-------------------------------------------" -ForegroundColor Green
Write-Host "Project file consolidation complete!" -ForegroundColor Green
Write-Host "Output saved to: $outputFilePath" -ForegroundColor Green
Write-Host "You can now copy the content of this text file." -ForegroundColor Green