#!/bin/bash

echo "🚀 Starting manual screenshot capture of modern UI..."

# Create screenshots directory
mkdir -p frontend/test-results

# Check if the dev server is running
echo "📡 Checking if dev server is running on localhost:8081..."
if curl -s http://localhost:8081 > /dev/null; then
    echo "✅ Dev server is running"
else
    echo "❌ Dev server is not running on localhost:8081"
    exit 1
fi

echo "📋 Manual testing instructions:"
echo ""
echo "🏠 Homepage: http://localhost:8081/"
echo "🔐 Auth page: http://localhost:8081/auth"
echo "📊 Dashboard: http://localhost:8081/dashboard"
echo "💬 Chat: http://localhost:8081/chat"
echo ""
echo "📝 Test Credentials:"
echo "   Email: jayveedz19@gmail.com"
echo "   Password: Goldyear2023#"
echo ""
echo "📸 Screenshots to capture:"
echo "   1. Homepage (full page)"
echo "   2. Auth page (full page + viewport)"
echo "   3. Auth form filled out"
echo "   4. After login submission"
echo "   5. Dashboard (if accessible)"
echo "   6. Chat interface"
echo "   7. Mobile responsive views"
echo ""
echo "💡 Use browser dev tools (F12) to:"
echo "   - Toggle device simulation for mobile screenshots"
echo "   - Use viewport sizes: 375x812 (mobile), 768x1024 (tablet), 1920x1080 (desktop)"
echo "   - Take screenshots with browser built-in screenshot tool"
echo ""

# Try to open the browser (if available)
if command -v google-chrome &> /dev/null; then
    echo "🌐 Opening Chrome browser..."
    google-chrome --new-window http://localhost:8081/auth &
elif command -v chromium-browser &> /dev/null; then
    echo "🌐 Opening Chromium browser..."
    chromium-browser --new-window http://localhost:8081/auth &
elif command -v firefox &> /dev/null; then
    echo "🌐 Opening Firefox browser..."
    firefox --new-window http://localhost:8081/auth &
else
    echo "⚠️ No browser found. Please manually navigate to http://localhost:8081/auth"
fi

echo ""
echo "✅ Setup complete! Please manually capture screenshots and save them to frontend/test-results/"
