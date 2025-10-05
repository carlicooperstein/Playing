# 🎧 Silent Disco Dolores

A real-time synchronized silent disco web app for parties in Dolores Park SF (or anywhere!). Upload Spotify playlists, broadcast to unlimited guests, and everyone dances to the same beat through their own AirPods.

![Silent Disco](https://img.shields.io/badge/Status-Ready%20to%20Party-purple)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

- **🎵 Spotify Integration**: Upload and play your Spotify playlists
- **📡 Real-time Sync**: Perfect synchronization across all devices
- **📱 No App Required**: Works directly in the browser
- **🎯 Easy Join**: QR code or 6-character room code
- **👥 Guest Management**: See who's connected in real-time
- **🎨 Beautiful UI**: Clean, modern interface with disco vibes
- **⚡ Low Latency**: WebSocket-based for instant updates
- **🔒 Secure**: Admin-only controls for music

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Spotify Developer Account (free)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/silent-disco-dolores.git
cd silent-disco-dolores
```

2. Install dependencies:
```bash
npm install
```

3. Set up Spotify App:
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Add `http://localhost:3000/api/spotify/callback` to Redirect URIs
   - Copy your Client ID and Client Secret

4. Configure environment variables:
```bash
cp env.example .env.local
```

Edit `.env.local` with your Spotify credentials:
```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/spotify/callback
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## 🎮 How to Use

### For DJs/Admins:

1. Click "Start as DJ" on the home page
2. Connect your Spotify account
3. Select a playlist
4. Click "Start Broadcasting"
5. Share the room code or QR code with guests
6. Control playback for everyone!

### For Guests:

1. Click "Join Party" or scan the QR code
2. Enter the 6-character room code
3. Allow audio permissions
4. Connect your AirPods/headphones
5. Dance! 🕺💃

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub

2. Import project to [Vercel](https://vercel.com/new)

3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL` (your Vercel URL)
   - `NEXT_PUBLIC_REDIRECT_URI` (your-app.vercel.app/api/spotify/callback)
   - `NEXT_PUBLIC_SOCKET_URL` (your Vercel URL)

4. Update Spotify app settings:
   - Add your production redirect URI to Spotify app

5. Deploy!

### Custom Server Deployment

For WebSocket support on custom servers:

```bash
npm run build
NODE_ENV=production node server.js
```

## 🏗️ Architecture

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Socket.io for real-time sync
- **State Management**: Zustand
- **Audio**: Web Audio API, Spotify Web API
- **UI Components**: Custom components with Radix UI primitives

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` | Spotify app client ID | `abc123...` |
| `SPOTIFY_CLIENT_SECRET` | Spotify app secret | `xyz789...` |
| `NEXT_PUBLIC_APP_URL` | Your app's URL | `https://silent-disco.vercel.app` |
| `NEXT_PUBLIC_REDIRECT_URI` | Spotify OAuth callback | `https://silent-disco.vercel.app/api/spotify/callback` |
| `NEXT_PUBLIC_SOCKET_URL` | WebSocket server URL | `https://silent-disco.vercel.app` |

## 🐛 Troubleshooting

### Audio not playing?
- Ensure browser has audio permissions
- Check that headphones are connected
- Try refreshing the page

### Can't connect to room?
- Verify the room code is correct
- Check your internet connection
- Ensure the DJ is still broadcasting

### Spotify authentication fails?
- Verify redirect URI matches exactly in Spotify app settings
- Check that Client ID and Secret are correct
- Clear browser cookies and try again

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this for your own silent disco parties!

## 🎉 Party Tips

- **Best with 10-100 people**: Scales well for park parties
- **Bring backup battery**: For your phone/device
- **Test beforehand**: Do a quick test run before the event
- **Have a backup DJ**: In case of connection issues
- **Set expectations**: Let guests know to bring charged headphones

## 🙏 Acknowledgments

Built with love for the Dolores Park community 🌈

---

**Ready to party?** [Start your silent disco now!](http://localhost:3000)

For issues or questions, open a GitHub issue or reach out on Twitter.




