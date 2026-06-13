param(
  [string]$OutputDir = "deliverables/pplus-observations"
)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$ErrorActionPreference = "Stop"
$root = (Resolve-Path ".").Path
$out = Join-Path $root $OutputDir
$slidesDir = Join-Path $out "slides"
New-Item -ItemType Directory -Force -Path $slidesDir | Out-Null

$W = 1920
$H = 1080
$BG = [System.Drawing.ColorTranslator]::FromHtml("#F6F8FB")
$Blue = [System.Drawing.ColorTranslator]::FromHtml("#12345B")
$Blue2 = [System.Drawing.ColorTranslator]::FromHtml("#1E4E7A")
$Green = [System.Drawing.ColorTranslator]::FromHtml("#16A34A")
$GreenSoft = [System.Drawing.ColorTranslator]::FromHtml("#EAF7EF")
$Amber = [System.Drawing.ColorTranslator]::FromHtml("#F59E0B")
$AmberSoft = [System.Drawing.ColorTranslator]::FromHtml("#FFF4D6")
$Gray = [System.Drawing.ColorTranslator]::FromHtml("#64748B")
$LightGray = [System.Drawing.ColorTranslator]::FromHtml("#E5E7EB")
$White = [System.Drawing.Color]::White
$Text = [System.Drawing.ColorTranslator]::FromHtml("#111827")

function Font($size, $style = "Regular") {
  $fontStyle = [System.Drawing.FontStyle]::$style
  return New-Object System.Drawing.Font("Arial", $size, $fontStyle, [System.Drawing.GraphicsUnit]::Pixel)
}

function Brush($color) {
  return New-Object System.Drawing.SolidBrush($color)
}

function PenC($color, $width = 2) {
  return New-Object System.Drawing.Pen($color, $width)
}

function RoundRect($x, $y, $w, $h, $r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function DrawCard($g, $x, $y, $w, $h, $r = 28, $fill = $White, $border = $LightGray) {
  $shadow = RoundRect ($x + 6) ($y + 8) $w $h $r
  $g.FillPath((Brush ([System.Drawing.Color]::FromArgb(28, 15, 23, 42))), $shadow)
  $path = RoundRect $x $y $w $h $r
  $g.FillPath((Brush $fill), $path)
  $g.DrawPath((PenC $border 2), $path)
}

function DrawText($g, $text, $font, $color, $x, $y, $w, $h, $align = "Far", $line = "Near") {
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.FormatFlags = $fmt.FormatFlags -bor [System.Drawing.StringFormatFlags]::DirectionRightToLeft
  $fmt.Alignment = [System.Drawing.StringAlignment]::$align
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::$line
  $fmt.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
  $rect = New-Object System.Drawing.RectangleF($x, $y, $w, $h)
  $g.DrawString($text, $font, (Brush $color), $rect, $fmt)
}

function DrawBadge($g, $text, $x, $y, $w, $fill, $color) {
  $path = RoundRect $x $y $w 46 23
  $g.FillPath((Brush $fill), $path)
  DrawText $g $text (Font 24 "Bold") $color ($x + 18) ($y + 8) ($w - 36) 30 "Center" "Center"
}

function DrawSmallBadge($g, $text, $x, $y, $w, $fill, $color) {
  $path = RoundRect $x $y $w 28 14
  $g.FillPath((Brush $fill), $path)
  DrawText $g $text (Font 16 "Bold") $color ($x + 10) ($y + 4) ($w - 20) 20 "Center" "Center"
}

function DrawHeader($g, $title, $subtitle) {
  DrawText $g "تقييم نظام إدارة المشاريع P+" (Font 24 "Bold") $Blue 120 54 1680 34
  DrawText $g $title (Font 52 "Bold") $Text 120 104 1680 72
  if ($subtitle) { DrawText $g $subtitle (Font 27) $Gray 120 184 1680 58 }
  $g.DrawLine((PenC $LightGray 2), 120, 260, 1800, 260)
}

function NewSlide($name, [scriptblock]$draw) {
  $bmp = New-Object System.Drawing.Bitmap($W, $H)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear($BG)
  & $draw $g
  $pngPath = Join-Path $slidesDir "$name.png"
  $jpgPath = Join-Path $slidesDir "$name.jpg"
  $bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $jpgEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
  $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 92L)
  $bmp.Save($jpgPath, $jpgEncoder, $encParams)
  $g.Dispose()
  $bmp.Dispose()
  return @{ Png = $pngPath; Jpg = $jpgPath }
}

$rows = @(
  @(1,"التكامل","الربط مع الأنظمة الأخرى","مغطى"),
  @(2,"تجربة المستخدم","واجهات النظام","مغطى"),
  @(3,"التقارير","لوحات الأداء التفاعلية","مغطى"),
  @(4,"التقارير","تصدير التقارير","مغطى"),
  @(5,"الجدولة","الاعتماد على MS Project","مغطى"),
  @(6,"الصلاحيات","إدارة الصلاحيات","مغطى"),
  @(7,"الصلاحيات","Role-Based Permissions","مغطى"),
  @(8,"المشاريع","أرشفة المشاريع","مغطى"),
  @(9,"المهام","مركز موحد للمهام","مغطى"),
  @(10,"النماذج","حفظ المسودات Auto Save","يحتاج تأكيد"),
  @(11,"لوحات الأداء","مركز موحد للوحات","مغطى"),
  @(12,"الاستدامة","Low-Code Configuration","مغطى"),
  @(13,"متطلبات الأعمال","الوحدات الإضافية","مغطى"),
  @(14,"المشاريع","تعدد قوالب المشاريع","مغطى"),
  @(15,"المشاريع","تعدد هياكل المشاريع","مغطى"),
  @(16,"التكامل الداخلي","ترابط عناصر المشروع","مغطى"),
  @(17,"المشاريع","إيقاف وإلغاء المشاريع","مغطى"),
  @(18,"المخرجات","إدارة Milestones","مغطى"),
  @(19,"المخاطر","تصعيد المخاطر","مغطى"),
  @(20,"الترابط","Dependencies & Impact Analysis","يحتاج تأكيد"),
  @(21,"المحافظ","تصنيف المحافظ والإدارات","مغطى")
)

$slideImages = @()

$slideImages += NewSlide "01-cover" {
  param($g)
  $g.FillRectangle((Brush $Blue), 0, 0, 1920, 18)
  DrawCard $g 120 150 1680 760 42
  DrawText $g "عرض تنفيذي" (Font 28 "Bold") $Green 180 210 1500 42
  DrawText $g "ملخص ملاحظات الوزارة على نظام إدارة المشاريع P+" (Font 68 "Bold") $Text 180 285 1500 170
  DrawText $g "آلية معالجة الملاحظات في نظام P+ من شركة Master Team" (Font 34) $Gray 180 475 1500 70
  DrawBadge $g "RTL · Government Executive Brief" 180 585 520 ([System.Drawing.ColorTranslator]::FromHtml("#EEF2FF")) $Blue
  DrawText $g "إجمالي الملاحظات: 21  |  مغطاة: 19  |  تحتاج تأكيد: 2" (Font 34 "Bold") $Blue 180 700 1500 55
  DrawText $g "مصدر المحتوى: وثيقة ملاحظات الوزارة على P+" (Font 24) $Gray 180 815 1500 40
}

$slideImages += NewSlide "02-executive-summary" {
  param($g)
  DrawHeader $g "الملخص التنفيذي" "يقيس هذا العرض مدى تغطية P+ لملاحظات الوزارة على النظام الحالي."
  $items = @(
    @("تغطية واسعة", "يغطي P+ معظم الملاحظات وظيفياً وبشكل Native ضمن قدرات النظام الأساسية.", $Green),
    @("نقطتان للتحقق", "يتطلب بندا Auto Save وCascade Impact Analysis إثباتاً عملياً في العرض الحي.", $Amber),
    @("قرار تنفيذي", "يمكن المضي في التقييم الفني مع ربط القرار النهائي بإثبات البنود المفتوحة.", $Blue)
  )
  $y = 340
  foreach ($item in $items) {
    DrawCard $g 170 $y 1580 145 26
    $g.FillEllipse((Brush $item[2]), 1610, ($y + 43), 56, 56)
    DrawText $g $item[0] (Font 34 "Bold") $Text 260 ($y + 26) 1280 45
    DrawText $g $item[1] (Font 27) $Gray 260 ($y + 78) 1280 45
    $y += 185
  }
}

$slideImages += NewSlide "03-summary-statistics" {
  param($g)
  DrawHeader $g "مؤشرات التغطية" "ملخص رقمي سريع لحالة معالجة الملاحظات."
  $cards = @(
    @("إجمالي الملاحظات", "21", $Blue),
    @("مغطاة بالكامل في P+", "19", $Green),
    @("تحتاج تأكيد في العرض الحي", "2", $Amber)
  )
  $x = 140
  foreach ($card in $cards) {
    DrawCard $g $x 335 520 250 34
    $g.FillRectangle((Brush $card[2]), $x, 335, 520, 14)
    DrawText $g $card[0] (Font 30 "Bold") $Gray ($x + 35) 390 450 42 "Center"
    DrawText $g $card[1] (Font 86 "Bold") $card[2] ($x + 35) 455 450 100 "Center"
    $x += 630
  }
  DrawCard $g 190 690 1540 190 34
  DrawText $g "مؤشر التغطية الإجمالي" (Font 32 "Bold") $Text 250 720 1420 45
  $g.FillRectangle((Brush ([System.Drawing.ColorTranslator]::FromHtml("#E5E7EB"))), 250, 800, 1300, 38)
  $g.FillRectangle((Brush $Green), 250, 800, [int](1300 * 19 / 21), 38)
  DrawText $g "19 / 21" (Font 34 "Bold") $Blue 250 850 1300 50 "Center"
}

$slideImages += NewSlide "04-condensed-table" {
  param($g)
  DrawHeader $g "جدول الملاحظات المختصر" "جدول تنفيذي مكثف للحالة العامة لكل ملاحظة."
  $left = 120; $top = 300; $rowH = 29
  DrawCard $g $left 282 1680 720 24
  $headers = @("#","التصنيف","الملاحظة المختصرة","حالة المعالجة")
  $xs = @(1660, 1340, 770, 260)
  $ws = @(80, 290, 520, 220)
  for ($i=0; $i -lt 4; $i++) {
    DrawText $g $headers[$i] (Font 21 "Bold") $Blue $xs[$i] $top $ws[$i] 28 "Center" "Center"
  }
  $y = $top + 38
  foreach ($r in $rows) {
    if ($r[0] % 2 -eq 0) { $g.FillRectangle((Brush ([System.Drawing.ColorTranslator]::FromHtml("#F8FAFC"))), 150, ($y - 2), 1620, $rowH) }
    DrawText $g "$($r[0])" (Font 16 "Bold") $Text 1660 $y 80 24 "Center" "Center"
    DrawText $g $r[1] (Font 16) $Text 1340 $y 290 24 "Center" "Center"
    DrawText $g $r[2] (Font 16) $Text 770 $y 520 24 "Center" "Center"
    $isConfirm = $r[3] -like "*تأكيد*"
    DrawSmallBadge $g $r[3] 285 ($y - 2) 165 ($(if($isConfirm){$AmberSoft}else{$GreenSoft})) ($(if($isConfirm){$Amber}else{$Green}))
    $y += $rowH
  }
}

$slideImages += NewSlide "05-key-strengths" {
  param($g)
  DrawHeader $g "نقاط القوة الرئيسية في P+" "المحاور التي تدعم تغطية أغلب ملاحظات الوزارة."
  $strengths = @(
    @("التكامل", "REST APIs وربط ERP والأنظمة الاستراتيجية.", "↔"),
    @("تجربة المستخدم", "واجهة موحدة ولوحات تفاعلية وتقارير قابلة للتخصيص.", "◫"),
    @("الاستدامة", "Low-Code Configuration لتقليل الاعتماد على التطوير.", "⚙"),
    @("متطلبات الأعمال", "قوالب وهياكل مشاريع متعددة ودعم P3 Management.", "▦")
  )
  $positions = @(@(120,330),@(1010,330),@(120,650),@(1010,650))
  for ($i=0; $i -lt $strengths.Count; $i++) {
    $p = $positions[$i]
    DrawCard $g $p[0] $p[1] 790 250 34
    DrawText $g $strengths[$i][2] (Font 58 "Bold") $Blue ($p[0] + 610) ($p[1] + 42) 100 80 "Center" "Center"
    DrawText $g $strengths[$i][0] (Font 38 "Bold") $Text ($p[0] + 60) ($p[1] + 55) 520 48
    DrawText $g $strengths[$i][1] (Font 27) $Gray ($p[0] + 60) ($p[1] + 120) 640 85
  }
}

$slideImages += NewSlide "06-live-demo" {
  param($g)
  DrawHeader $g "بنود تتطلب تأكيداً في العرض الحي" "نقطتان فقط يجب التحقق منهما عملياً قبل التعاقد."
  $items = @(
    @("10", "حفظ المسودات Auto Save", "التأكد من دعم حفظ النماذج كمسودة والحفظ التلقائي على جميع نماذج الإنشاء."),
    @("20", "Dependencies & Impact Analysis", "التحقق من عمق تحليل الأثر المتسلسل بين المشاريع عند تأخر أحدها.")
  )
  $x = 170
  foreach ($item in $items) {
    DrawCard $g $x 360 740 395 42 $AmberSoft ([System.Drawing.ColorTranslator]::FromHtml("#FCD34D"))
    $g.FillEllipse((Brush $Amber), ($x + 575), 415, 96, 96)
    DrawText $g $item[0] (Font 46 "Bold") $White ($x + 575) 424 96 80 "Center" "Center"
    DrawText $g $item[1] (Font 38 "Bold") $Text ($x + 55) 530 600 55
    DrawText $g $item[2] (Font 28) ([System.Drawing.ColorTranslator]::FromHtml("#7C2D12")) ($x + 55) 610 610 110
    DrawBadge $g "يحتاج تأكيد في العرض الحي" ($x + 55) 740 350 $White $Amber
    $x += 840
  }
}

$slideImages += NewSlide "07-conclusion" {
  param($g)
  DrawHeader $g "الخلاصة التنفيذية" "قرار واضح ومختصر لقيادة المشروع."
  DrawCard $g 160 340 1600 430 42
  DrawText $g "يغطي P+ معظم ملاحظات الوزارة بشكل أصيل" (Font 56 "Bold") $Text 240 400 1440 75
  DrawText $g "يوضح التقييم أن نظام P+ يغطي 19 ملاحظة من أصل 21 ضمن قدراته الأساسية في التكامل، تجربة المستخدم، الاستدامة، ومتطلبات الأعمال. تبقى نقطتان فقط بحاجة إلى إثبات مباشر في العرض الحي قبل التعاقد: Auto Save وCascade Impact Analysis." (Font 32) $Gray 240 505 1440 160
  DrawText $g "التوصية: متابعة المسار التعاقدي مع اشتراط تحقق المورد من البندين المفتوحين عملياً أثناء العرض الحي." (Font 34 "Bold") $Blue 240 695 1440 55
  DrawBadge $g "جاهز للعرض التنفيذي والتصدير" 660 835 600 $GreenSoft $Green
}

function XmlEscape($s) {
  return [System.Security.SecurityElement]::Escape([string]$s)
}

function AddZipText($zip, $path, $text) {
  $entry = $zip.CreateEntry($path)
  $writer = New-Object System.IO.StreamWriter($entry.Open(), [System.Text.UTF8Encoding]::new($false))
  $writer.Write($text)
  $writer.Dispose()
}

function AddZipFile($zip, $path, $file) {
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file, $path, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}

$pptxPath = Join-Path $out "Ministry_Observations_PPlus_Executive_Arabic.pptx"
if (Test-Path $pptxPath) { Remove-Item $pptxPath -Force }
$zip = [System.IO.Compression.ZipFile]::Open($pptxPath, [System.IO.Compression.ZipArchiveMode]::Create)

$slideCount = $slideImages.Count
$contentTypes = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
$(for ($i=1; $i -le $slideCount; $i++) { "<Override PartName=`"/ppt/slides/slide$i.xml`" ContentType=`"application/vnd.openxmlformats-officedocument.presentationml.slide+xml`"/>" })
</Types>
"@
AddZipText $zip "[Content_Types].xml" $contentTypes
AddZipText $zip "_rels/.rels" "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><Relationships xmlns=`"http://schemas.openxmlformats.org/package/2006/relationships`"><Relationship Id=`"rId1`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument`" Target=`"ppt/presentation.xml`"/></Relationships>"

$slideIdList = ""
$presRels = "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><Relationships xmlns=`"http://schemas.openxmlformats.org/package/2006/relationships`"><Relationship Id=`"rId1`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster`" Target=`"slideMasters/slideMaster1.xml`"/><Relationship Id=`"rId2`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme`" Target=`"theme/theme1.xml`"/>"
for ($i=1; $i -le $slideCount; $i++) {
  $slideIdList += "<p:sldId id=`"$([uint32](255 + $i))`" r:id=`"rId$($i+2)`"/>"
  $presRels += "<Relationship Id=`"rId$($i+2)`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide`" Target=`"slides/slide$i.xml`"/>"
}
$presRels += "</Relationships>"

AddZipText $zip "ppt/presentation.xml" "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><p:presentation xmlns:a=`"http://schemas.openxmlformats.org/drawingml/2006/main`" xmlns:r=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships`" xmlns:p=`"http://schemas.openxmlformats.org/presentationml/2006/main`"><p:sldMasterIdLst><p:sldMasterId id=`"2147483648`" r:id=`"rId1`"/></p:sldMasterIdLst><p:sldIdLst>$slideIdList</p:sldIdLst><p:sldSz cx=`"12192000`" cy=`"6858000`" type=`"wide`"/><p:notesSz cx=`"6858000`" cy=`"9144000`"/></p:presentation>"
AddZipText $zip "ppt/_rels/presentation.xml.rels" $presRels
AddZipText $zip "ppt/theme/theme1.xml" "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><a:theme xmlns:a=`"http://schemas.openxmlformats.org/drawingml/2006/main`" name=`"PPlus Executive`"><a:themeElements><a:clrScheme name=`"PPlus`"><a:dk1><a:srgbClr val=`"111827`"/></a:dk1><a:lt1><a:srgbClr val=`"FFFFFF`"/></a:lt1><a:dk2><a:srgbClr val=`"12345B`"/></a:dk2><a:lt2><a:srgbClr val=`"F6F8FB`"/></a:lt2><a:accent1><a:srgbClr val=`"16A34A`"/></a:accent1><a:accent2><a:srgbClr val=`"F59E0B`"/></a:accent2><a:accent3><a:srgbClr val=`"1E4E7A`"/></a:accent3><a:accent4><a:srgbClr val=`"64748B`"/></a:accent4><a:accent5><a:srgbClr val=`"E5E7EB`"/></a:accent5><a:accent6><a:srgbClr val=`"0F172A`"/></a:accent6><a:hlink><a:srgbClr val=`"1E4E7A`"/></a:hlink><a:folHlink><a:srgbClr val=`"12345B`"/></a:folHlink></a:clrScheme><a:fontScheme name=`"Arial`"><a:majorFont><a:latin typeface=`"Arial`"/><a:ea typeface=`"Arial`"/><a:cs typeface=`"Arial`"/></a:majorFont><a:minorFont><a:latin typeface=`"Arial`"/><a:ea typeface=`"Arial`"/><a:cs typeface=`"Arial`"/></a:minorFont></a:fontScheme><a:fmtScheme name=`"PPlus`"><a:fillStyleLst><a:solidFill><a:schemeClr val=`"phClr`"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w=`"9525`"><a:solidFill><a:schemeClr val=`"phClr`"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val=`"phClr`"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>"
AddZipText $zip "ppt/slideMasters/slideMaster1.xml" "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><p:sldMaster xmlns:a=`"http://schemas.openxmlformats.org/drawingml/2006/main`" xmlns:r=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships`" xmlns:p=`"http://schemas.openxmlformats.org/presentationml/2006/main`"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id=`"1`" name=`"`"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld><p:sldLayoutIdLst><p:sldLayoutId id=`"2147483649`" r:id=`"rId1`"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>"
AddZipText $zip "ppt/slideMasters/_rels/slideMaster1.xml.rels" "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><Relationships xmlns=`"http://schemas.openxmlformats.org/package/2006/relationships`"><Relationship Id=`"rId1`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout`" Target=`"../slideLayouts/slideLayout1.xml`"/><Relationship Id=`"rId2`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme`" Target=`"../theme/theme1.xml`"/></Relationships>"
AddZipText $zip "ppt/slideLayouts/slideLayout1.xml" "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><p:sldLayout xmlns:a=`"http://schemas.openxmlformats.org/drawingml/2006/main`" xmlns:r=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships`" xmlns:p=`"http://schemas.openxmlformats.org/presentationml/2006/main`" type=`"blank`"><p:cSld name=`"Blank`"><p:spTree><p:nvGrpSpPr><p:cNvPr id=`"1`" name=`"`"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/></p:spTree></p:cSld></p:sldLayout>"
AddZipText $zip "ppt/slideLayouts/_rels/slideLayout1.xml.rels" "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><Relationships xmlns=`"http://schemas.openxmlformats.org/package/2006/relationships`"><Relationship Id=`"rId1`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster`" Target=`"../slideMasters/slideMaster1.xml`"/></Relationships>"

for ($i=1; $i -le $slideCount; $i++) {
  $mediaName = "image$i.png"
  AddZipFile $zip "ppt/media/$mediaName" $slideImages[$i-1].Png
  $slideXml = "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><p:sld xmlns:a=`"http://schemas.openxmlformats.org/drawingml/2006/main`" xmlns:r=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships`" xmlns:p=`"http://schemas.openxmlformats.org/presentationml/2006/main`"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id=`"1`" name=`"`"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:pic><p:nvPicPr><p:cNvPr id=`"2`" name=`"Slide Image $i`"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed=`"rId1`"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x=`"0`" y=`"0`"/><a:ext cx=`"12192000`" cy=`"6858000`"/></a:xfrm><a:prstGeom prst=`"rect`"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>"
  AddZipText $zip "ppt/slides/slide$i.xml" $slideXml
  AddZipText $zip "ppt/slides/_rels/slide$i.xml.rels" "<?xml version=`"1.0`" encoding=`"UTF-8`" standalone=`"yes`"?><Relationships xmlns=`"http://schemas.openxmlformats.org/package/2006/relationships`"><Relationship Id=`"rId1`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image`" Target=`"../media/$mediaName`"/><Relationship Id=`"rId2`" Type=`"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout`" Target=`"../slideLayouts/slideLayout1.xml`"/></Relationships>"
}
$zip.Dispose()

$pdfPath = Join-Path $out "Ministry_Observations_PPlus_Executive_Arabic.pdf"
if (Test-Path $pdfPath) { Remove-Item $pdfPath -Force }
$objects = New-Object System.Collections.ArrayList
$pagesKids = ""
$pageW = 960
$pageH = 540
$objects.Add(@{ Text = "<< /Type /Catalog /Pages 2 0 R >>" }) | Out-Null
$objects.Add(@{ Text = "PAGES_PLACEHOLDER" }) | Out-Null
$objNum = 3
for ($i=0; $i -lt $slideImages.Count; $i++) {
  $jpgBytes = [System.IO.File]::ReadAllBytes($slideImages[$i].Jpg)
  $imgObj = $objNum
  $contentObj = $objNum + 1
  $pageObj = $objNum + 2
  $objects.Add(@{
    Prefix = "<< /Type /XObject /Subtype /Image /Width $W /Height $H /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length $($jpgBytes.Length) >>`nstream`n"
    Bytes = $jpgBytes
    Suffix = "`nendstream"
  }) | Out-Null
  $content = "q $pageW 0 0 $pageH 0 0 cm /Im$($i+1) Do Q"
  $objects.Add(@{ Text = "<< /Length $($content.Length) >>`nstream`n$content`nendstream" }) | Out-Null
  $objects.Add(@{ Text = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 $pageW $pageH] /Resources << /XObject << /Im$($i+1) $imgObj 0 R >> >> /Contents $contentObj 0 R >>" }) | Out-Null
  $pagesKids += "$pageObj 0 R "
  $objNum += 3
}
$objects[1] = @{ Text = "<< /Type /Pages /Kids [ $pagesKids] /Count $($slideImages.Count) >>" }

$ascii = [System.Text.Encoding]::ASCII
$stream = [System.IO.File]::Open($pdfPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
function WriteAscii($stream, $text) {
  $bytes = $ascii.GetBytes($text)
  $stream.Write($bytes, 0, $bytes.Length)
}
WriteAscii $stream "%PDF-1.4`n%PPlus`n"
$offsets = @(0)
for ($i=0; $i -lt $objects.Count; $i++) {
  $offsets += $stream.Position
  WriteAscii $stream "$($i+1) 0 obj`n"
  $obj = $objects[$i]
  if ($obj.ContainsKey("Bytes")) {
    WriteAscii $stream $obj.Prefix
    $stream.Write($obj.Bytes, 0, $obj.Bytes.Length)
    WriteAscii $stream $obj.Suffix
  } else {
    WriteAscii $stream $obj.Text
  }
  WriteAscii $stream "`nendobj`n"
}
$xref = $stream.Position
WriteAscii $stream "xref`n0 $($objects.Count + 1)`n0000000000 65535 f `n"
for ($i=1; $i -lt $offsets.Count; $i++) {
  WriteAscii $stream ("{0:D10} 00000 n `n" -f $offsets[$i])
}
WriteAscii $stream "trailer`n<< /Size $($objects.Count + 1) /Root 1 0 R >>`nstartxref`n$xref`n%%EOF"
$stream.Dispose()

Write-Host "Created:"
Write-Host $pptxPath
Write-Host $pdfPath
