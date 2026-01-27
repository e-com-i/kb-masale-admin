@echo off
echo.
echo ======================================
echo E-Commerce Admin Setup Script
echo ======================================
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] npm found
npm --version
echo.

REM Install dependencies
echo Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [OK] Dependencies installed successfully!
echo.

REM Check if .env.local exists
if not exist ".env.local" (
    echo [WARNING] .env.local not found. Creating from template...
    echo GITHUB_TOKEN=your_github_personal_access_token_here > .env.local
    echo [OK] Created .env.local
)

echo.
echo ======================================
echo Setup complete!
echo ======================================
echo.
echo Next steps:
echo   1. Edit .env.local and add your GitHub Personal Access Token
echo      Get token from: https://github.com/settings/tokens
echo      Required scope: repo
echo.
echo   2. Run the development server:
echo      npm run dev
echo.
echo   3. Open http://localhost:3000 in your browser
echo.
echo Read README.md for detailed instructions
echo.
pause
