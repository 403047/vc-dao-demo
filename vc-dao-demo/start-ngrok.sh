#!/bin/bash

# Start ngrok tunnel for VC-DAO frontend
echo "🚀 Starting ngrok tunnel for VC-DAO Frontend..."
echo "📱 This will expose localhost:3000 to the internet"
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed!"
    echo "📥 Please install ngrok from: https://ngrok.com/download"
    echo "💡 Or use: winget install ngrok"
    exit 1
fi

# Start ngrok tunnel
echo "🌐 Starting tunnel..."
ngrok http 3000 --region=us --log=stdout