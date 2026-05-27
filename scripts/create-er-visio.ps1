$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$outputPath = Join-Path $root 'docs\er-diagram.vsdx'

$visio = New-Object -ComObject Visio.Application
$visio.Visible = $false
$visio.AlertResponse = 7

try {
  $document = $visio.Documents.Add('')
  $page = $visio.ActivePage
  $page.PageSheet.CellsU('PageWidth').ResultIU = 16.5
  $page.PageSheet.CellsU('PageHeight').ResultIU = 10.5

  function Set-TextStyle($shape, [int]$size = 8, [bool]$bold = $false) {
    $shape.CellsU('Char.Size').FormulaU = "$size pt"
    $shape.CellsU('Char.Font').FormulaU = 'THEMEGUARD(2)'
    $shape.CellsU('Char.Style').FormulaU = if ($bold) { '1' } else { '0' }
    $shape.CellsU('Para.HorzAlign').FormulaU = '0'
    $shape.CellsU('VerticalAlign').FormulaU = '0'
  }

  function Add-Box($name, [string[]]$fields, [double]$x, [double]$y, [double]$w, [double]$h) {
    $shape = $page.DrawRectangle($x, $y - $h, $x + $w, $y)
    $shape.CellsU('FillForegnd').FormulaU = 'RGB(255,255,255)'
    $shape.CellsU('LineColor').FormulaU = 'RGB(17,17,17)'
    $shape.CellsU('LineWeight').FormulaU = '1.1 pt'
    $shape.Text = "$name`n" + ($fields -join "`n")
    Set-TextStyle $shape 7 $false

    $header = $page.DrawRectangle($x, $y - 0.34, $x + $w, $y)
    $header.CellsU('FillForegnd').FormulaU = 'RGB(230,230,230)'
    $header.CellsU('LineColor').FormulaU = 'RGB(17,17,17)'
    $header.CellsU('LineWeight').FormulaU = '1.1 pt'
    $header.Text = $name
    Set-TextStyle $header 9 $true

    return [PSCustomObject]@{
      Name = $name
      Shape = $shape
      X = $x
      Y = $y
      W = $w
      H = $h
      Left = $x
      Right = $x + $w
      Top = $y
      Bottom = $y - $h
      CX = $x + ($w / 2)
      CY = $y - ($h / 2)
    }
  }

  function Add-Line($from, $to, [string]$fromLabel, [string]$toLabel) {
    $line = $page.DrawLine($from.CX, $from.CY, $to.CX, $to.CY)
    $line.CellsU('LineColor').FormulaU = 'RGB(35,35,35)'
    $line.CellsU('LineWeight').FormulaU = '0.9 pt'

    $fx = ($from.CX * 0.82) + ($to.CX * 0.18)
    $fy = ($from.CY * 0.82) + ($to.CY * 0.18)
    $tx = ($from.CX * 0.18) + ($to.CX * 0.82)
    $ty = ($from.CY * 0.18) + ($to.CY * 0.82)

    foreach ($label in @(
      @{ Text = $fromLabel; X = $fx; Y = $fy },
      @{ Text = $toLabel; X = $tx; Y = $ty }
    )) {
      $s = $page.DrawRectangle($label.X - 0.12, $label.Y - 0.10, $label.X + 0.12, $label.Y + 0.10)
      $s.CellsU('FillForegnd').FormulaU = 'RGB(255,255,255)'
      $s.CellsU('LinePattern').FormulaU = '0'
      $s.Text = $label.Text
      Set-TextStyle $s 8 $true
    }
  }

  $entities = @{}

  $entities.User = Add-Box 'User' @(
    'PK  id',
    'UK  username',
    'UK  email',
    '    passwordHash',
    '    createdAt',
    '    updatedAt'
  ) 6.65 9.6 2.0 1.7

  $entities.Profile = Add-Box 'Profile' @(
    'PK  id',
    'FK  userId',
    '    nickname',
    '    location',
    '    bio',
    '    avatarUrl',
    '    avatarKey',
    '    professionalSkills',
    '    professionalSoftware',
    '    publicEmail',
    '    showPublicEmail',
    '    hiringTypes',
    '    socialLinks',
    '    publishReady',
    '    notifyLikes',
    '    notifyComments',
    '    emailNotifications',
    '    createdAt',
    '    updatedAt'
  ) 0.45 9.85 2.55 4.4

  $entities.Work = Add-Box 'Work' @(
    'PK  id',
    'FK  authorId',
    '    title',
    '    category',
    '    description',
    '    status',
    '    imageUrl',
    '    imageKey',
    '    imageWidth',
    '    imageHeight',
    '    thumbnailUrl',
    '    thumbnailKey',
    '    thumbnailWidth',
    '    thumbnailHeight',
    '    tags',
    '    featured',
    '    createdAt',
    '    updatedAt'
  ) 10.25 9.85 2.55 4.2

  $entities.WorkImage = Add-Box 'WorkImage' @(
    'PK  id',
    'FK  workId',
    '    url',
    '    key',
    '    width',
    '    height',
    '    sortOrder',
    '    createdAt'
  ) 13.65 9.85 2.25 2.2

  $entities.LibraryFolder = Add-Box 'LibraryFolder' @(
    'PK  id',
    'FK  userId',
    '    name',
    '    sortOrder',
    '    createdAt',
    '    updatedAt'
  ) 0.45 4.9 2.55 1.75

  $entities.SavedWork = Add-Box 'SavedWork' @(
    'PK  id',
    'FK  userId',
    'FK  workId',
    'FK  folderId',
    '    savedAt'
  ) 6.35 4.9 2.35 1.65

  $entities.Notification = Add-Box 'Notification' @(
    'PK  id',
    'FK  userId',
    '    text',
    '    type',
    '    href',
    '    actorId',
    '    workId',
    '    unread',
    '    createdAt'
  ) 0.45 2.85 2.55 2.25

  $entities.PasswordResetToken = Add-Box 'PasswordResetToken' @(
    'PK  id',
    'FK  userId',
    'UK  tokenHash',
    '    expiresAt',
    '    usedAt',
    '    createdAt'
  ) 0.45 0.65 2.55 1.75

  $entities.WorkLike = Add-Box 'WorkLike' @(
    'PK  id',
    'FK  userId',
    'FK  workId',
    '    createdAt'
  ) 10.25 4.8 2.35 1.35

  $entities.WorkComment = Add-Box 'WorkComment' @(
    'PK  id',
    'FK  userId',
    'FK  workId',
    '    text',
    '    createdAt'
  ) 10.25 2.95 2.35 1.55

  $entities.WorkView = Add-Box 'WorkView' @(
    'PK  id',
    'FK  userId',
    'FK  workId',
    '    viewerKey',
    '    viewedAt'
  ) 10.25 1.05 2.35 1.55

  Add-Line $entities.User $entities.Profile '1' '1'
  Add-Line $entities.User $entities.Work '1' 'M'
  Add-Line $entities.Work $entities.WorkImage '1' 'M'
  Add-Line $entities.User $entities.LibraryFolder '1' 'M'
  Add-Line $entities.User $entities.SavedWork '1' 'M'
  Add-Line $entities.Work $entities.SavedWork '1' 'M'
  Add-Line $entities.LibraryFolder $entities.SavedWork '1' 'M'
  Add-Line $entities.User $entities.Notification '1' 'M'
  Add-Line $entities.User $entities.PasswordResetToken '1' 'M'
  Add-Line $entities.User $entities.WorkLike '1' 'M'
  Add-Line $entities.Work $entities.WorkLike '1' 'M'
  Add-Line $entities.User $entities.WorkComment '1' 'M'
  Add-Line $entities.Work $entities.WorkComment '1' 'M'
  Add-Line $entities.User $entities.WorkView '1' 'M'
  Add-Line $entities.Work $entities.WorkView '1' 'M'

  $caption = $page.DrawRectangle(4.4, 0.05, 12.1, 0.42)
  $caption.CellsU('LinePattern').FormulaU = '0'
  $caption.CellsU('FillPattern').FormulaU = '0'
  $caption.Text = 'Figure 3.2 - ArtSide database ER diagram'
  Set-TextStyle $caption 12 $false
  $caption.CellsU('Para.HorzAlign').FormulaU = '1'

  if (Test-Path -LiteralPath $outputPath) {
    Remove-Item -LiteralPath $outputPath -Force
  }

  $document.SaveAs($outputPath)
  $document.Close()
}
finally {
  $visio.Quit()
}

Write-Host $outputPath
