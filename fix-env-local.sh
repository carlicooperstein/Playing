#!/bin/bash

echo "🔧 Fixing .env.local redirect URI..."

# Backup current .env.local
if [ -f .env.local ]; then
    cp .env.local .env.local.backup
    echo "✅ Backed up .env.local to .env.local.backup"
fi

# Update the redirect URI in .env.local
if [ -f .env.local ]; then
    # Use sed to replace the old IP with the new one
    sed -i '' 's|NEXT_PUBLIC_REDIRECT_URI=http://192.168.1.207:3000/api/spotify/callback|NEXT_PUBLIC_REDIRECT_URI=http://192.168.1.66:3000/api/spotify/callback|g' .env.local
    sed -i '' 's|NEXT_PUBLIC_SOCKET_URL=http://192.168.1.207:3000|NEXT_PUBLIC_SOCKET_URL=http://192.168.1.66:3000|g' .env.local
    sed -i '' 's|NEXT_PUBLIC_APP_URL=http://192.168.1.207:3000|NEXT_PUBLIC_APP_URL=http://192.168.1.66:3000|g' .env.local
    
    echo "✅ Updated .env.local with correct IP address (192.168.1.66)"
    echo ""
    echo "📄 Current configuration:"
    grep -E "REDIRECT_URI|SOCKET_URL|APP_URL" .env.local | grep -v "^#"
else
    echo "❌ No .env.local file found!"
fi

echo ""
echo "📋 Next steps:"
echo "1. Go to Spotify Developer Dashboard"
echo "2. Remove these URIs:"
echo "   - https://playing-production-7747.up.railway.app/"
echo "   - https://playing-xi.vercel.app/"
echo ""
echo "3. Add these complete URIs:"
echo "   - https://playing-production-7747.up.railway.app/api/spotify/callback"
echo "   - https://playing-xi.vercel.app/api/spotify/callback"
echo ""
echo "4. Restart your dev server: pnpm dev"
