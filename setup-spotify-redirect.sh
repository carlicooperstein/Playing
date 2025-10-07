#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get current IP address
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d'/' -f1)
else
    # Windows (Git Bash)
    IP=$(ipconfig | grep "IPv4" | head -1 | awk '{print $NF}')
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Spotify OAuth Redirect URI Setup Helper${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}Your current local IP address:${NC} ${YELLOW}$IP${NC}"
echo ""

echo -e "${GREEN}Step 1: Update your .env.local file${NC}"
echo "----------------------------------------"
echo "Add these lines to your .env.local file:"
echo ""
echo -e "${YELLOW}NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here"
echo "SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here"
echo "NEXT_PUBLIC_REDIRECT_URI=http://$IP:3000/api/spotify/callback"
echo "NEXT_PUBLIC_SOCKET_URL=http://$IP:3000${NC}"
echo ""

echo -e "${GREEN}Step 2: Add to Spotify Developer Dashboard${NC}"
echo "----------------------------------------"
echo "Go to: https://developer.spotify.com/dashboard"
echo "Select your app and add this EXACT redirect URI:"
echo ""
echo -e "${YELLOW}http://$IP:3000/api/spotify/callback${NC}"
echo ""

echo -e "${GREEN}Step 3: For Railway Production${NC}"
echo "----------------------------------------"
echo "Add these environment variables in Railway:"
echo ""
echo -e "${YELLOW}NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here"
echo "SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here"
echo "NEXT_PUBLIC_REDIRECT_URI=https://your-app.up.railway.app/api/spotify/callback"
echo "NEXT_PUBLIC_SOCKET_URL=https://your-app.up.railway.app${NC}"
echo ""
echo "And add this redirect URI to Spotify Dashboard:"
echo -e "${YELLOW}https://your-app.up.railway.app/api/spotify/callback${NC}"
echo ""

echo -e "${RED}Important Notes:${NC}"
echo "• The redirect URI must match EXACTLY in all three places"
echo "• Include protocol (http://), IP/domain, port, and full path"
echo "• Your IP may change when switching networks"
echo "• You can add multiple redirect URIs to Spotify Dashboard"
echo ""

echo -e "${GREEN}Current .env.local configuration:${NC}"
if [ -f ".env.local" ]; then
    echo "Found .env.local file with:"
    grep "REDIRECT_URI\|SOCKET_URL" .env.local 2>/dev/null || echo "No redirect URI configured yet"
else
    echo -e "${YELLOW}No .env.local file found. Creating one...${NC}"
    cat > .env.local << EOF
# Spotify API Configuration
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# Redirect URI using your local IP address
NEXT_PUBLIC_REDIRECT_URI=http://$IP:3000/api/spotify/callback

# Socket Server URL Configuration using IP address
NEXT_PUBLIC_SOCKET_URL=http://$IP:3000
EOF
    echo -e "${GREEN}Created .env.local with IP-based configuration${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${BLUE}Access your app at:${NC} ${YELLOW}http://$IP:3000${NC}"
echo -e "${GREEN}========================================${NC}"
