param(
    [string]$Source = "assets/native/pop-checklist-app-icon-master.png"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$workspace = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $workspace $Source
$resourceRoot = Join-Path $workspace "android/app/src/main/res"
$master = [System.Drawing.Image]::FromFile($sourcePath)

$densitySizes = [ordered]@{
    "mdpi" = 48
    "hdpi" = 72
    "xhdpi" = 96
    "xxhdpi" = 144
    "xxxhdpi" = 192
}

function New-IconBitmap {
    param(
        [int]$Size,
        [bool]$Round,
        [double]$ContentScale = 1.0
    )

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $bitmap.SetResolution(96, 96)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    if ($Round) {
        $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
        $clip.AddEllipse(0, 0, $Size, $Size)
        $graphics.SetClip($clip)
        $clip.Dispose()
    }
    $graphics.Clear([System.Drawing.Color]::White)

    $contentSize = [int][Math]::Round($Size * $ContentScale)
    $offset = [int][Math]::Round(($Size - $contentSize) / 2)
    $destination = New-Object System.Drawing.Rectangle($offset, $offset, $contentSize, $contentSize)
    $graphics.DrawImage($master, $destination)
    $graphics.Dispose()
    return $bitmap
}

foreach ($entry in $densitySizes.GetEnumerator()) {
    $directory = Join-Path $resourceRoot "mipmap-$($entry.Key)"
    $icon = New-IconBitmap -Size $entry.Value -Round $false
    $icon.Save(
        (Join-Path $directory "ic_pop_checklist.png"),
        [System.Drawing.Imaging.ImageFormat]::Png
    )
    $icon.Dispose()

    $roundIcon = New-IconBitmap -Size $entry.Value -Round $true
    $roundIcon.Save(
        (Join-Path $directory "ic_pop_checklist_round.png"),
        [System.Drawing.Imaging.ImageFormat]::Png
    )
    $roundIcon.Dispose()

    $foregroundSize = [int][Math]::Round($entry.Value * 2.25)
    $foreground = New-IconBitmap -Size $foregroundSize -Round $false
    $foreground.Save(
        (Join-Path $directory "ic_pop_checklist_foreground.png"),
        [System.Drawing.Imaging.ImageFormat]::Png
    )
    $foreground.Dispose()
}

$master.Dispose()
