param(
  [Parameter(Position = 0)]
  [ValidateSet("start", "stop", "restart", "status")]
  [string] $Action = "start",

  [switch] $Stripe
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$VarDir = Join-Path $Root "var"
$PidDir = Join-Path $VarDir "dev-stack"
$PhpApiDir = Join-Path $Root "php-api"
$SiteV2Dir = Join-Path $Root "site-v2"
$MariaDbExe = "C:\Program Files\MariaDB 12.3\bin\mariadbd.exe"
$MariaDbData = "C:\Program Files\MariaDB 12.3\data"

New-Item -ItemType Directory -Force -Path $VarDir, $PidDir | Out-Null

function Get-PidPath([string] $Name) {
  Join-Path $PidDir "$Name.pid"
}

function Save-Pid([string] $Name, [int] $ProcessIdValue) {
  Set-Content -Path (Get-PidPath $Name) -Value $ProcessIdValue -NoNewline
}

function Read-Pid([string] $Name) {
  $path = Get-PidPath $Name
  if (-not (Test-Path $path)) {
    return $null
  }

  $raw = (Get-Content $path -Raw).Trim()
  if (-not $raw) {
    return $null
  }

  return [int] $raw
}

function Test-Port([int] $Port) {
  foreach ($hostName in @("localhost", "127.0.0.1", "::1")) {
    try {
      $client = [System.Net.Sockets.TcpClient]::new()
      $async = $client.BeginConnect($hostName, $Port, $null, $null)
      $ok = $async.AsyncWaitHandle.WaitOne(750)
      if ($ok) {
        $client.EndConnect($async)
        $client.Close()
        return $true
      }
      $client.Close()
    } catch {
      try {
        $client.Close()
      } catch {
        # ignore cleanup errors
      }
    }
  }

  return $false
}

function Test-Http([string] $Url) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Stop-ByPidFile([string] $Name) {
  $pidValue = Read-Pid $Name
  $pidPath = Get-PidPath $Name

  if ($null -eq $pidValue) {
    Write-Host "${Name}: no pid file"
    return
  }

  $proc = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
  if ($proc) {
    Stop-Process -Id $pidValue -Force
    Write-Host "${Name}: stopped pid $pidValue"
  } else {
    Write-Host "${Name}: pid $pidValue was not running"
  }

  Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
}

function Start-MariaDb {
  if (Test-Port 3306) {
    $existing = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like "mariadbd*" } |
      Select-Object -First 1

    if ($existing) {
      Save-Pid "mariadb" ([int] $existing.ProcessId)
    }

    Write-Host "MariaDB: already reachable on 3306"
    return
  }

  if (-not (Test-Path $MariaDbExe)) {
    Write-Host "MariaDB: not found at $MariaDbExe"
    return
  }

  $proc = Start-Process `
    -FilePath $MariaDbExe `
    -ArgumentList @("--datadir=$MariaDbData", "--port=3306", "--console") `
    -WindowStyle Hidden `
    -PassThru

  Save-Pid "mariadb" $proc.Id
  Start-Sleep -Seconds 3
  Write-Host "MariaDB: started pid $($proc.Id)"
}

function Start-Site {
  if (Test-Http "http://localhost:8000/en/gift-card/") {
    $existing = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -eq "powershell.exe" -and $_.CommandLine -like "*astro.mjs dev*--port 8000*" } |
      Select-Object -First 1

    if ($existing) {
      Save-Pid "website" ([int] $existing.ProcessId)
    }

    Write-Host "Website: already reachable on 8000"
    return
  }

  $proc = Start-Process `
    -FilePath "powershell" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "`$env:ASTRO_TELEMETRY_DISABLED='1'; npx -p node@22 node .\node_modules\astro\bin\astro.mjs dev --host localhost --port 8000") `
    -WorkingDirectory $SiteV2Dir `
    -RedirectStandardOutput (Join-Path $VarDir "local-site.out.log") `
    -RedirectStandardError (Join-Path $VarDir "local-site.err.log") `
    -WindowStyle Hidden `
    -PassThru

  Save-Pid "website" $proc.Id
  Write-Host "Website: started pid $($proc.Id) at http://localhost:8000"
}

function Start-Api {
  if (Test-Http "http://localhost:8080/health") {
    $existing = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -eq "php.exe" -and $_.CommandLine -like "*-S localhost:8080*" } |
      Select-Object -First 1

    if ($existing) {
      Save-Pid "api" ([int] $existing.ProcessId)
    }

    Write-Host "API: already reachable on 8080"
    return
  }

  $proc = Start-Process `
    -FilePath "php" `
    -ArgumentList @("-S", "localhost:8080", "-t", "public", "public/index.php") `
    -WorkingDirectory $PhpApiDir `
    -RedirectStandardOutput (Join-Path $VarDir "local-api.out.log") `
    -RedirectStandardError (Join-Path $VarDir "local-api.err.log") `
    -WindowStyle Hidden `
    -PassThru

  Save-Pid "api" $proc.Id
  Write-Host "API: started pid $($proc.Id) at http://localhost:8080"
}

function Start-Scheduler {
  $existing = Read-Pid "scheduler"
  if ($existing -and (Get-Process -Id $existing -ErrorAction SilentlyContinue)) {
    Write-Host "Scheduler: already running pid $existing"
    return
  }

  $command = @"
`$ErrorActionPreference = 'SilentlyContinue'
`$envPath = '$PhpApiDir\.env'
`$secret = (Get-Content `$envPath | Select-String '^INTERNAL_JOB_SECRET=' | Select-Object -First 1).ToString().Substring(20)
while (`$true) {
  try {
    Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/internal/process-jobs' -Headers @{ Authorization = 'Bearer ' + `$secret } | Out-Null
  } catch {}
  Start-Sleep -Seconds 10
}
"@

  $proc = Start-Process `
    -FilePath "powershell" `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $command) `
    -WindowStyle Hidden `
    -PassThru

  Save-Pid "scheduler" $proc.Id
  Write-Host "Scheduler: started pid $($proc.Id)"
}

function Start-Stripe {
  $existing = Read-Pid "stripe"
  if ($existing -and (Get-Process -Id $existing -ErrorAction SilentlyContinue)) {
    Write-Host "Stripe listener: already running pid $existing"
    return
  }

  $stripeScript = (Get-Command stripe -ErrorAction SilentlyContinue).Source
  if (-not $stripeScript) {
    Write-Host "Stripe listener: stripe CLI not found"
    return
  }

  $events = "checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired,charge.dispute.created,charge.dispute.updated,charge.dispute.funds_withdrawn,charge.dispute.closed,refund.updated,refund.failed"

  $proc = Start-Process `
    -FilePath "powershell" `
    -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-File", $stripeScript, "listen", "--events=$events", "--forward-to=http://localhost:8080/webhooks/stripe") `
    -WorkingDirectory $Root `
    -PassThru

  Save-Pid "stripe" $proc.Id
  Write-Host "Stripe listener: opened visible window pid $($proc.Id)"
}

function Show-Status {
  Write-Host "Ports:"
  Write-Host "  MariaDB 3306: $(if (Test-Port 3306) { 'up' } else { 'down' })"
  Write-Host "  Website 8000: $(if (Test-Http 'http://localhost:8000/en/gift-card/') { 'up' } else { 'down' })"
  Write-Host "  API     8080: $(if (Test-Http 'http://localhost:8080/health') { 'up' } else { 'down' })"
  Write-Host ""
  Write-Host "PID files:"
  foreach ($name in @("mariadb", "website", "api", "scheduler", "stripe")) {
    $pidValue = Read-Pid $name
    if ($pidValue -and (Get-Process -Id $pidValue -ErrorAction SilentlyContinue)) {
      Write-Host "  ${name}: running pid $pidValue"
    } elseif ($pidValue) {
      Write-Host "  ${name}: stale pid $pidValue"
    } else {
      Write-Host "  ${name}: no pid"
    }
  }
}

function Start-All {
  Start-MariaDb
  Start-Site
  Start-Api
  Start-Sleep -Seconds 2
  Start-Scheduler
  if ($Stripe) {
    Start-Stripe
  }

  Write-Host ""
  Show-Status
  Write-Host ""
  Write-Host "Open:"
  Write-Host "  Gift:    http://localhost:8000/en/gift-card/"
  Write-Host "  Loyalty: http://localhost:8000/en/loyalty/"
  Write-Host "  API:     http://localhost:8080/health"
}

function Stop-All {
  foreach ($name in @("stripe", "scheduler", "api", "website", "mariadb")) {
    Stop-ByPidFile $name
  }
}

switch ($Action) {
  "start" {
    Start-All
  }
  "stop" {
    Stop-All
  }
  "restart" {
    Stop-All
    Start-Sleep -Seconds 1
    Start-All
  }
  "status" {
    Show-Status
  }
}
