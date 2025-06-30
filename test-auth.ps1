# PowerShell script to test authentication endpoints
Write-Host "🚀 Testing ParaSocial Authentication Endpoints" -ForegroundColor Green

# 1. Test Registration
Write-Host "`n📝 Testing Registration..." -ForegroundColor Yellow
try {
    $registerBody = @{
        email = "test@example.com"
        username = "testuser123"
        password = "Password123"
        displayName = "Test User"
    } | ConvertTo-Json

    $registerResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    $registerResponse | ConvertTo-Json -Depth 3
}
catch {
    Write-Host "❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorContent = $reader.ReadToEnd()
        Write-Host "Error details: $errorContent" -ForegroundColor Red
    }
}

# 2. Test Login
Write-Host "`n🔐 Testing Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "test@example.com"
        password = "Password123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "Token: $token" -ForegroundColor Cyan
    $loginResponse | ConvertTo-Json -Depth 3
}
catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    return
}

# 3. Test Get Current User
Write-Host "`n👤 Testing Get Current User..." -ForegroundColor Yellow
try {
    $headers = @{
        Authorization = "Bearer $token"
    }

    $userResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/me" -Method GET -Headers $headers
    Write-Host "✅ Get current user successful!" -ForegroundColor Green
    $userResponse | ConvertTo-Json -Depth 3
}
catch {
    Write-Host "❌ Get current user failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Test Logout
Write-Host "`n🚪 Testing Logout..." -ForegroundColor Yellow
try {
    $logoutResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/auth/logout" -Method POST -Headers $headers
    Write-Host "✅ Logout successful!" -ForegroundColor Green
    $logoutResponse | ConvertTo-Json -Depth 3
}
catch {
    Write-Host "❌ Logout failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Testing complete!" -ForegroundColor Green
