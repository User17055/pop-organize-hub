param(
    [string]$KeystorePath = (Join-Path $PSScriptRoot "..\android\pop-organize-upload.jks"),
    [string]$Alias = "pop-organize-upload",
    [switch]$GeneratePassword,
    [switch]$RepairProperties
)

$ErrorActionPreference = "Stop"
$resolvedAndroidDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\android"))
$resolvedKeystorePath = [System.IO.Path]::GetFullPath($KeystorePath)
if (-not $resolvedKeystorePath.StartsWith($resolvedAndroidDirectory, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Por segurança, salve a chave dentro da pasta android e depois faça um backup externo seguro."
}
$propertiesPath = Join-Path $resolvedAndroidDirectory "keystore.properties"
if ($RepairProperties) {
    if (-not (Test-Path -LiteralPath $propertiesPath)) { throw "keystore.properties não encontrado." }
    $existingLines = [IO.File]::ReadAllLines($propertiesPath) | ForEach-Object { $_.TrimStart([char]0xFEFF) }
    [IO.File]::WriteAllLines($propertiesPath, $existingLines, (New-Object Text.UTF8Encoding($false)))
    Write-Host "keystore.properties reparado sem alterar as credenciais."
    exit 0
}
if (Test-Path -LiteralPath $resolvedKeystorePath) {
    throw "O arquivo já existe: $resolvedKeystorePath"
}

$securePassword = if ($GeneratePassword) {
    $randomBytes = New-Object byte[] 32
    $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
    $randomGenerator.GetBytes($randomBytes)
    $randomGenerator.Dispose()
    $generatedPassword = [Convert]::ToBase64String($randomBytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
    ConvertTo-SecureString $generatedPassword -AsPlainText -Force
} else {
    Read-Host "Crie uma senha forte para a chave de upload" -AsSecureString
}
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    if ($plainPassword.Length -lt 12) { throw "Use uma senha com pelo menos 12 caracteres." }
    $keytool = if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME "bin\keytool.exe" } else { "keytool" }
    & $keytool -genkeypair -v -keystore $resolvedKeystorePath -alias $Alias -keyalg RSA -keysize 4096 -validity 10000 -storepass $plainPassword -keypass $plainPassword -dname "CN=Pop Organize, O=Pop Organize, C=BR"
    if ($LASTEXITCODE -ne 0) { throw "O keytool não conseguiu criar a chave." }

    $relativeStorePath = $resolvedKeystorePath.Substring($resolvedAndroidDirectory.Length).TrimStart("\", "/").Replace("\", "/")
    $propertyLines = @(
        "storeFile=$relativeStorePath"
        "storePassword=$plainPassword"
        "keyAlias=$Alias"
        "keyPassword=$plainPassword"
    )
    [IO.File]::WriteAllLines($propertiesPath, $propertyLines, (New-Object Text.UTF8Encoding($false)))
    Write-Host "Chave criada e configurada. Faça backup de $resolvedKeystorePath e da senha agora."
} finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    $plainPassword = $null
    $generatedPassword = $null
    if ($randomBytes) { [Array]::Clear($randomBytes, 0, $randomBytes.Length) }
}
