$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

function New-RoundedPath([int]$size, [single]$inset, [single]$radius) {
  $x = $inset
  $y = $inset
  $width = $size - 2 * $inset
  $height = $width
  $diameter = 2 * $radius
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc([single]$x, [single]$y, [single]$diameter, [single]$diameter, 180, 90)
  $path.AddArc([single]($x + $width - $diameter), [single]$y, [single]$diameter, [single]$diameter, 270, 90)
  $path.AddArc([single]($x + $width - $diameter), [single]($y + $height - $diameter), [single]$diameter, [single]$diameter, 0, 90)
  $path.AddArc([single]$x, [single]($y + $height - $diameter), [single]$diameter, [single]$diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-IconPng([int]$size) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $outer = New-RoundedPath $size ([single]($size * 0.025)) ([single]($size * 0.22))
  $bounds = [System.Drawing.RectangleF]::new(0, 0, $size, $size)
  $gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new($bounds, [System.Drawing.Color]::FromArgb(255, 45, 224, 239), [System.Drawing.Color]::FromArgb(255, 16, 112, 157), 315)
  $graphics.FillPath($gradient, $outer)
  $outerPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 4, 32, 48), [single]($size * 0.035))
  $graphics.DrawPath($outerPen, $outer)

  $circleRect = [System.Drawing.RectangleF]::new([single]($size * 0.12), [single]($size * 0.12), [single]($size * 0.76), [single]($size * 0.76))
  $circleBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 7, 24, 39))
  $circlePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(230, 110, 238, 245), [single]($size * 0.025))
  $graphics.FillEllipse($circleBrush, $circleRect)
  $graphics.DrawEllipse($circlePen, $circleRect)

  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 237, 250, 255))
  $cyan = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 49, 220, 239))
  $fontTop = [System.Drawing.Font]::new('Segoe UI', [single]($size * 0.20), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $fontBottom = [System.Drawing.Font]::new('Segoe UI', [single]($size * 0.31), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $graphics.DrawString('MH', $fontTop, $white, [System.Drawing.RectangleF]::new(0, [single]($size * 0.25), $size, [single]($size * 0.28)), $format)
  $graphics.DrawString('3', $fontBottom, $cyan, [System.Drawing.RectangleF]::new(0, [single]($size * 0.49), $size, [single]($size * 0.39)), $format)

  $memory = [System.IO.MemoryStream]::new()
  $bitmap.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
  $bytes = $memory.ToArray()
  $memory.Dispose()
  $fontBottom.Dispose(); $fontTop.Dispose(); $cyan.Dispose(); $white.Dispose()
  $circlePen.Dispose(); $circleBrush.Dispose(); $outerPen.Dispose(); $gradient.Dispose(); $outer.Dispose()
  $graphics.Dispose(); $bitmap.Dispose()
  return ,$bytes
}

$sizes = @(256, 128, 64, 48, 32, 16)
$frames = foreach ($size in $sizes) { [pscustomobject]@{ Size = $size; Bytes = (New-IconPng $size) } }
$outputPath = Join-Path $PSScriptRoot '..\assets\mh3.ico'
$outputPath = [System.IO.Path]::GetFullPath($outputPath)
$stream = [System.IO.File]::Create($outputPath)
$writer = [System.IO.BinaryWriter]::new($stream)
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]$frames.Count)
$offset = 6 + 16 * $frames.Count
foreach ($frame in $frames) {
  $dimension = if ($frame.Size -eq 256) { [byte]0 } else { [byte]$frame.Size }
  $writer.Write($dimension)
  $writer.Write($dimension)
  $writer.Write([byte]0)
  $writer.Write([byte]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]32)
  $writer.Write([UInt32]$frame.Bytes.Length)
  $writer.Write([UInt32]$offset)
  $offset += $frame.Bytes.Length
}
foreach ($frame in $frames) { $writer.Write([byte[]]$frame.Bytes) }
$writer.Dispose()
$stream.Dispose()
Write-Output $outputPath
