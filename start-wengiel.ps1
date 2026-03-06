$nodeCandidates = @(
  (Get-Command node -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
  "C:\Program Files\nodejs\node.exe",
  "C:\Program Files (x86)\nodejs\node.exe"
) | Where-Object { $_ -and (Test-Path $_) }

if (-not $nodeCandidates) {
  Write-Error "Nie znaleziono node.exe. Uruchom nowy terminal albo zainstaluj Node.js."
  exit 1
}

$node = @($nodeCandidates)[0]
& $node "$PSScriptRoot\server.js"
