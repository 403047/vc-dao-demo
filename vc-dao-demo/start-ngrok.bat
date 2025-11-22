@echo off
REM Start ngrok tunnel for VC-DAO frontend
echo 🚀 Starting ngrok tunnel for VC-DAO Frontend...
echo 📱 This will expose localhost:3000 to the internet
echo.

REM Check if ngrok is installed
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ngrok is not installed!
    echo 📥 Please install ngrok from: https://ngrok.com/download
    echo 💡 Or use: winget install ngrok
    pause
    exit /b 1
)

REM Start ngrok tunnel
echo 🌐 Starting tunnel...
ngrok http 3000 --region=us --log=stdout