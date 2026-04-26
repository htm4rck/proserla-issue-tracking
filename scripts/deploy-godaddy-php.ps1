#Requires -Version 5.1
<#
.SYNOPSIS
  Generates godaddy-php/config.php from .env and uploads the PHP bridge via FTP/FTPS.

.DESCRIPTION
  Reads repo-root .env, replaces placeholders in godaddy-php/config.deploy.php.template,
  writes godaddy-php/config.php (gitignored), then uploads:
  upload.php, .htaccess, uploads/.htaccess, config.php

  Run from repo root:
    pwsh ./scripts/deploy-godaddy-php.ps1
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$EnvPath = Join-Path $RepoRoot '.env'
$PhpDir = Join-Path $RepoRoot 'godaddy-php'
$TemplatePath = Join-Path $PhpDir 'config.deploy.php.template'

if (-not (Test-Path -LiteralPath $EnvPath)) {
    Write-Error "Missing .env at $EnvPath - copy .env.example to .env and fill FTP + URLs."
}

function Read-DotEnv {
    param([string] $Path)
    $map = @{}
    Get-Content -LiteralPath $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq '' -or $line.StartsWith('#')) { return }
        $idx = $line.IndexOf('=')
        if ($idx -lt 1) { return }
        $k = $line.Substring(0, $idx).Trim()
        $v = $line.Substring($idx + 1).Trim()
        if (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'"))) {
            $v = $v.Substring(1, $v.Length - 2)
        }
        $map[$k] = $v
    }
    $map
}

function Get-FromEnv {
    param([hashtable] $Map, [string] $Key, [switch] $Required)
    if (-not $Map.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($Map[$Key])) {
        if ($Required) { Write-Error "Missing required env key: $Key" }
        return $null
    }
    return $Map[$Key].Trim()
}

function ConvertTo-Base64NoBreak {
    param([string] $Text)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
    [Convert]::ToBase64String($bytes)
}

function Write-ConfigPhp {
    param(
        [string] $TemplatePath,
        [string] $OutPath,
        [string] $SecretB64,
        [string] $UrlB64
    )
    $tpl = Get-Content -LiteralPath $TemplatePath -Raw -Encoding UTF8
    $tpl = $tpl.Replace('%%UPLOAD_SECRET_B64%%', $SecretB64)
    $tpl = $tpl.Replace('%%BASE_PUBLIC_URL_B64%%', $UrlB64)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($OutPath, $tpl, $utf8NoBom)
}

function Invoke-FtpRequest {
    param(
        [System.Uri] $RequestUri,
        [string] $Method,
        [System.Net.NetworkCredential] $Credential,
        [bool] $EnableSsl,
        [byte[]] $FileBytes = $null
    )
    $req = [System.Net.FtpWebRequest]::Create($RequestUri)
    $req = [System.Net.FtpWebRequest]$req
    $req.Credentials = $Credential
    $req.EnableSsl = $EnableSsl
    $req.UsePassive = $true
    $req.UseBinary = $true
    $req.KeepAlive = $false
    $req.Method = $Method
    if ($null -ne $FileBytes) {
        $req.ContentLength = $FileBytes.Length
        $stream = $req.GetRequestStream()
        try {
            $stream.Write($FileBytes, 0, $FileBytes.Length)
        } finally {
            $stream.Close()
        }
    }
    try {
        $resp = $req.GetResponse()
        try { $resp.Close() } catch { }
    } catch [System.Net.WebException] {
        $r = $_.Exception.Response
        if ($null -ne $r) { try { $r.Close() } catch { } }
        if ($Method -eq ([System.Net.WebRequestMethods+Ftp]::MakeDirectory)) {
            return
        }
        throw
    }
}

function Ensure-RemoteUploadsDir {
    param(
        [string] $HostName,
        [string] $RemoteBase,
        [System.Net.NetworkCredential] $Credential,
        [bool] $EnableSsl
    )
    $path = $RemoteBase.TrimEnd('/') + '/uploads/'
    if (-not $path.StartsWith('/')) {
        $path = '/' + $path.TrimStart('/')
    }
    $uri = [System.Uri]::new("ftp://${HostName}${path}")
    try {
        Invoke-FtpRequest -RequestUri $uri -Method ([System.Net.WebRequestMethods+Ftp]::MakeDirectory) -Credential $Credential -EnableSsl $EnableSsl
    } catch {
        Write-Host "Note: remote uploads/ may already exist."
    }
}

function Send-FtpFile {
    param(
        [string] $HostName,
        [string] $RemoteUnixPath,
        [string] $LocalPath,
        [System.Net.NetworkCredential] $Credential,
        [bool] $EnableSsl
    )
    $bytes = [System.IO.File]::ReadAllBytes($LocalPath)
    $uri = [System.Uri]::new("ftp://$HostName$RemoteUnixPath")
    Invoke-FtpRequest -RequestUri $uri -Method ([System.Net.WebRequestMethods+Ftp]::UploadFile) -Credential $Credential -EnableSsl $EnableSsl -FileBytes $bytes
}

# --- Load env ---
$envMap = Read-DotEnv -Path $EnvPath
$ftpHost = Get-FromEnv $envMap 'GODADDY_FTP_HOST' -Required
$ftpUser = Get-FromEnv $envMap 'GODADDY_FTP_USER' -Required
$ftpPass = Get-FromEnv $envMap 'GODADDY_FTP_PASSWORD' -Required
$ftpRemote = Get-FromEnv $envMap 'GODADDY_FTP_REMOTE_PATH' -Required
$useTlsStr = Get-FromEnv $envMap 'GODADDY_FTP_USE_TLS'
$useTls = $true
if ($null -ne $useTlsStr -and $useTlsStr.ToLowerInvariant() -in @('false', '0', 'no')) {
    $useTls = $false
}
$publicBase = Get-FromEnv $envMap 'GODADDY_PHP_PUBLIC_BASE_URL' -Required
$uploadSecret = Get-FromEnv $envMap 'GODADDY_UPLOAD_SECRET' -Required

if (-not $publicBase.EndsWith('/')) {
    $publicBase = "$publicBase/"
}

$secretB64 = ConvertTo-Base64NoBreak $uploadSecret
$urlB64 = ConvertTo-Base64NoBreak $publicBase
$configOut = Join-Path $PhpDir 'config.php'
Write-ConfigPhp -TemplatePath $TemplatePath -OutPath $configOut -SecretB64 $secretB64 -UrlB64 $urlB64
Write-Host "Wrote $configOut"

$cred = [System.Net.NetworkCredential]::new($ftpUser, $ftpPass)
$remoteBase = $ftpRemote.TrimEnd('/') + '/'

Ensure-RemoteUploadsDir -HostName $ftpHost -RemoteBase $remoteBase -Credential $cred -EnableSsl $useTls

$files = @(
    @{ Local = (Join-Path $PhpDir 'upload.php'); Remote = "${remoteBase}upload.php" }
    @{ Local = (Join-Path $PhpDir '.htaccess'); Remote = "${remoteBase}.htaccess" }
    @{ Local = (Join-Path $PhpDir 'uploads\.htaccess'); Remote = "${remoteBase}uploads/.htaccess" }
    @{ Local = $configOut; Remote = "${remoteBase}config.php" }
)

foreach ($item in $files) {
    if (-not (Test-Path -LiteralPath $item.Local)) {
        Write-Error "Local file missing: $($item.Local)"
    }
    $unixRemote = '/' + ($item.Remote -replace '\\', '/').TrimStart('/')
    Write-Host "FTP upload -> $unixRemote"
    Send-FtpFile -HostName $ftpHost -RemoteUnixPath $unixRemote -LocalPath $item.Local -Credential $cred -EnableSsl $useTls
}

Write-Host 'Done. Verify: POST to upload.php with codigo_incidencia, tipo_imagen, file, X-Upload-Token.'
