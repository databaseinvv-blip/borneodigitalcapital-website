# Recompress the homepage sector photos for web delivery.
#
# They ship at up to 6016x4016 (24 MP) but render in ~275x330 CSS-pixel cards,
# so even a retina display never needs more than ~1600px. Originals are moved
# to images/originals/ (gitignored) before anything is overwritten.
#
#   powershell -ExecutionPolicy Bypass -File tools/compress_images.ps1

Add-Type -AssemblyName System.Drawing

$root    = Split-Path -Parent $PSScriptRoot
$images  = Join-Path $root 'images'
$backup  = Join-Path $images 'originals'
$maxW    = 1600
$quality = 82

if (-not (Test-Path $backup)) { New-Item -ItemType Directory -Path $backup | Out-Null }

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
         Where-Object { $_.MimeType -eq 'image/jpeg' }

foreach ($name in @('sector-1.jpg', 'sector-2.jpg', 'sector-3.jpg', 'sector-4.jpg')) {
    $live = Join-Path $images $name
    $orig = Join-Path $backup $name
    if (-not (Test-Path $live)) { "skip $name (missing)"; continue }

    # Move the original aside first so we never read and write the same file.
    if (-not (Test-Path $orig)) { Move-Item $live $orig }
    elseif (Test-Path $live)    { Remove-Item $live }

    $before = (Get-Item $orig).Length
    $img = [System.Drawing.Image]::FromFile($orig)
    try {
        # capture before the finally-block disposes $img, so logging can use them
        $ow = $img.Width
        $oh = $img.Height
        $ratio = [Math]::Min(1.0, $maxW / $ow)
        $nw = [int]($ow * $ratio)
        $nh = [int]($oh * $ratio)

        $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        try {
            $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
            $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
            $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
            $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
            $g.DrawImage($img, 0, 0, $nw, $nh)
        } finally { $g.Dispose() }

        $eps = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $eps.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
            [System.Drawing.Imaging.Encoder]::Quality, [int]$quality)
        $bmp.Save($live, $codec, $eps)
        $bmp.Dispose()
    } finally { $img.Dispose() }

    $after = (Get-Item $live).Length
    "{0,-14} {1,5}x{2,-5} -> {3,4}x{4,-5} {5,8:N0} KB -> {6,6:N0} KB  ({7:N0}% smaller)" -f `
        $name, $ow, $oh, $nw, $nh, ($before/1KB), ($after/1KB),
        ((1 - $after/$before) * 100)
}
