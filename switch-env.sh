#!/bin/bash

# Script to switch between local and Vercel environments

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}Environment Switcher${NC}"
echo "======================"
echo ""
echo "1) Local Development (IP: 192.168.1.66)"
echo "2) Vercel Production (playing-xi.vercel.app)"
echo ""
read -p "Select environment (1 or 2): " choice

case $choice in
  1)
    echo -e "${BLUE}Switching to LOCAL development...${NC}"
    cat > .env.local << EOF
# Spotify API Credentials
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=42dd5db55516412289ecf834c0a89fc9
SPOTIFY_CLIENT_SECRET=64f497977a8c49249378acfc423bc4bd

# For local development - Use your network IP for mobile access
NEXT_PUBLIC_APP_URL=http://192.168.1.66:3000
NEXT_PUBLIC_REDIRECT_URI=http://192.168.1.66:3000/api/spotify/callback
NEXT_PUBLIC_SOCKET_URL=http://192.168.1.66:3000
EOF
    echo -e "${GREEN}✓ Switched to LOCAL environment${NC}"
    echo -e "${YELLOW}Redirect URI: http://192.168.1.66:3000/api/spotify/callback${NC}"
    ;;
  2)
    echo -e "${BLUE}Switching to VERCEL production...${NC}"
    cat > .env.local << EOF
# Spotify API Credentials
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=42dd5db55516412289ecf834c0a89fc9
SPOTIFY_CLIENT_SECRET=64f497977a8c49249378acfc423bc4bd

# For Vercel production
NEXT_PUBLIC_APP_URL=https://playing-xi.vercel.app
NEXT_PUBLIC_REDIRECT_URI=https://playing-xi.vercel.app/api/spotify/callback
NEXT_PUBLIC_SOCKET_URL=https://playing-xi.vercel.app
EOF
    echo -e "${GREEN}✓ Switched to VERCEL environment${NC}"
    echo -e "${YELLOW}Redirect URI: https://playing-xi.vercel.app/api/spotify/callback${NC}"
    ;;
  *)
    echo -e "${YELLOW}Invalid choice. No changes made.${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${BLUE}Restart your dev server for changes to take effect:${NC}"
echo "  pnpm dev"
