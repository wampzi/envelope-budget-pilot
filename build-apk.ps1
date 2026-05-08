$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$javaHome = "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
$androidHome = Join-Path $root ".android-sdk"
$gradle = Join-Path $root ".gradle-bin\gradle-8.9\bin\gradle.bat"
$assetTarget = Join-Path $root "android\app\src\main\assets\www"

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidHome
$env:ANDROID_SDK_ROOT = $androidHome
$env:Path = "$javaHome\bin;$androidHome\platform-tools;$env:Path"

New-Item -ItemType Directory -Force -Path $assetTarget | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $assetTarget "assets") | Out-Null
Copy-Item `
  (Join-Path $root "index.html"), `
  (Join-Path $root "styles.css"), `
  (Join-Path $root "app.js"), `
  (Join-Path $root "manifest.webmanifest"), `
  (Join-Path $root "service-worker.js"), `
  (Join-Path $root "icon.svg") `
  $assetTarget `
  -Force
Copy-Item (Join-Path $root "assets\*") (Join-Path $assetTarget "assets") -Recurse -Force

Push-Location (Join-Path $root "android")
try {
  & $gradle assembleDebug
} finally {
  Pop-Location
}

Write-Host "APK created at: $root\android\app\build\outputs\apk\debug\app-debug.apk"