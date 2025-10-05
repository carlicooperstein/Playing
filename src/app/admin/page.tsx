'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, Play, Pause, SkipForward, SkipBack, Users, 
  Upload, Search, Volume2, Wifi, Copy, Check,
  QrCode, ChevronRight, Loader2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDiscoStore } from '@/store/disco-store';
import { spotifyService, Track, Playlist } from '@/lib/spotify';
import { discoSocketClient } from '@/lib/socket-client';
import QRCode from 'qrcode';
import Image from 'next/image';

export default function AdminDashboard() {
  const store = useDiscoStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [hasFullPlayback, setHasFullPlayback] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const isProcessingAuth = useRef(false);
  const hasConnected = useRef(false);

  useEffect(() => {
    // Only connect once
    if (!hasConnected.current) {
      discoSocketClient.connect();
      hasConnected.current = true;
    }
    
    // Check for Spotify auth
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    // Prevent duplicate processing
    if (code && !isProcessingAuth.current) {
      isProcessingAuth.current = true;
      handleSpotifyCallback(code);
    }

    // Don't disconnect on unmount - keep the connection alive
    return () => {
      // Only stop sync, don't disconnect
      discoSocketClient.stopAdminSync();
      // Don't disconnect here - let the room persist
      // discoSocketClient.disconnect();
    };
  }, []);

  useEffect(() => {
    if (store.roomCode) {
      generateQRCode();
      discoSocketClient.startAdminSync();
      
      // Log room info for debugging
      console.log('Room active:', store.roomCode);
      console.log('Join URL:', `${process.env.NEXT_PUBLIC_APP_URL}/join?room=${store.roomCode}`);
    }
  }, [store.roomCode]);

  const handleSpotifyCallback = async (code: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Clean URL immediately to prevent re-processing
      window.history.replaceState({}, document.title, '/admin');
      
      console.log('Processing Spotify callback...');
      const token = await spotifyService.handleCallback(code);
      store.setAccessToken(token);
      await spotifyService.initializeClient(token);
      
      // Try to initialize Spotify Web Player for full songs
      console.log('Checking for Spotify Premium...');
      const fullPlayback = await discoSocketClient.initializeSpotifyPlayer(token);
      setHasFullPlayback(fullPlayback);
      if (fullPlayback) {
        console.log('✅ Full song playback enabled with Spotify Premium!');
      } else {
        console.log('⚠️ Using 30-second preview mode (Spotify Premium required for full songs)');
      }
      
      // Load playlists
      console.log('Loading playlists...');
      const playlists = await spotifyService.getUserPlaylists();
      store.setPlaylists(playlists);
      
      console.log('Authentication successful!');
      setError(null);
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'Failed to authenticate with Spotify');
      isProcessingAuth.current = false; // Reset flag on error
    } finally {
      setIsLoading(false);
    }
  };

  const connectSpotify = async () => {
    try {
      setError(null);
      await spotifyService.authenticate();
    } catch (err) {
      setError('Failed to connect to Spotify');
    }
  };

  const createRoom = async () => {
    if (!selectedPlaylist) {
      setError('Please select a playlist first');
      return;
    }

    try {
      setIsLoading(true);
      const adminId = `admin_${Date.now()}`;
      store.setAdmin(true, adminId);
      
      const roomCode = await discoSocketClient.createRoom(adminId, selectedPlaylist.tracks);
      store.setCurrentPlaylist(selectedPlaylist);
      
      // Initialize the first track for the admin
      if (selectedPlaylist.tracks[0]) {
        discoSocketClient.updateTrack(selectedPlaylist.tracks[0]);
      }
      
      console.log('Room created successfully:', roomCode);
      setError(null);
    } catch (err) {
      setError('Failed to create room');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!store.roomCode) return;
    
    // Use the network IP for mobile access
    const joinUrl = `http://192.168.1.66:3000/join?room=${store.roomCode}`;
    console.log('QR Code URL:', joinUrl);
    
    try {
      const url = await QRCode.toDataURL(joinUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#00000000',
        },
      });
      setQrCodeUrl(url);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  const copyRoomCode = () => {
    if (store.roomCode) {
      navigator.clipboard.writeText(store.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePlayPause = () => {
    // Prevent double-clicking
    if (isToggling) return;
    
    // Update UI state immediately for responsiveness
    const newState = !store.isPlaying;
    store.setIsPlaying(newState);
    setIsToggling(true);
    
    // Handle audio and network operations asynchronously
    (async () => {
      // Ensure audio context is resumed (for browser autoplay policies)
      if (newState) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          await audioContext.resume();
          audioContext.close();
        } catch (e) {
          console.log('Audio context already active');
        }
      }
      
      // Ensure the current track is sent to guests before playing
      if (newState && store.currentTrack) {
        // Always update track when starting playback to ensure it's loaded
        discoSocketClient.updateTrack(store.currentTrack);
      }
      
      discoSocketClient.togglePlayback(newState, store.currentTime);
      
      // Re-enable button after a short delay
      setTimeout(() => setIsToggling(false), 200);
    })();
  };

  const handleNextTrack = () => {
    // Update state immediately
    store.nextTrack();
    // Send update asynchronously
    if (store.currentTrack) {
      setTimeout(() => discoSocketClient.updateTrack(store.currentTrack!), 0);
    }
  };

  const handlePreviousTrack = () => {
    // Update state immediately
    store.previousTrack();
    // Send update asynchronously
    if (store.currentTrack) {
      setTimeout(() => discoSocketClient.updateTrack(store.currentTrack!), 0);
    }
  };

  const selectTrack = (track: Track, index: number) => {
    console.log('Selecting track:', track.name, 'Preview URL:', track.preview_url);
    if (!track.preview_url) {
      setError(`Track "${track.name}" has no preview available`);
      setTimeout(() => setError(null), 3000);
    }
    store.setCurrentTrack(track, index);
    discoSocketClient.updateTrack(track);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Rest of component remains the same...
  if (!store.accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/10 backdrop-blur-md border-purple-300/20">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Connect Spotify</CardTitle>
            <CardDescription className="text-purple-200">
              Connect your Spotify account to start the party
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={connectSpotify}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Music className="mr-2 h-4 w-4" />
              )}
              Connect with Spotify
            </Button>
            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </p>
                <p className="text-xs text-red-300 mt-2">
                  Make sure your Spotify app has this redirect URI: http://127.0.0.1:3000/api/spotify/callback
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!store.roomCode) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">Select a Playlist</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            </div>
          )}

          {isLoading && store.playlists.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 text-purple-300 animate-spin" />
              <span className="ml-3 text-purple-200">Loading your playlists...</span>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {store.playlists.map((playlist) => (
                <Card 
                  key={playlist.id}
                  className={`bg-white/10 backdrop-blur-md border-purple-300/20 hover:bg-white/20 transition-all cursor-pointer ${
                    selectedPlaylist?.id === playlist.id ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => setSelectedPlaylist(playlist)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      {playlist.image && (
                        <img 
                          src={playlist.image} 
                          alt={playlist.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white text-lg truncate">
                          {playlist.name}
                        </CardTitle>
                        <CardDescription className="text-purple-200">
                          {playlist.tracks.length} tracks • by {playlist.owner}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              onClick={createRoom}
              disabled={!selectedPlaylist || isLoading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Wifi className="mr-2 h-5 w-5" />
              )}
              Start Broadcasting
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Full DJ Dashboard
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">DJ Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-lg px-4 py-2">
              <Users className="h-5 w-5 text-purple-300" />
              <span className="text-white font-medium">{store.connectedGuests} guests</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-lg px-4 py-2">
              <Wifi className="h-5 w-5 text-green-400" />
              <span className="text-white font-medium">Live</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Player */}
          <div className="lg:col-span-2 space-y-6">
            {/* Now Playing */}
            <Card className="bg-white/10 backdrop-blur-md border-purple-300/20">
              <CardContent className="p-6">
                {/* Playback Mode Indicator */}
                <div className="mb-4 flex justify-center">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    hasFullPlayback 
                      ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  }`}>
                    <Music className="h-4 w-4" />
                    {hasFullPlayback ? 'Full Songs (Premium)' : '30-Second Previews'}
                  </div>
                </div>
                {store.currentTrack ? (
                  <div className="flex items-center gap-4">
                    {store.currentTrack.image && (
                      <img 
                        src={store.currentTrack.image}
                        alt={store.currentTrack.name}
                        className="w-24 h-24 rounded-lg object-cover animate-pulse-glow"
                      />
                    )}
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-white mb-1">
                        {store.currentTrack.name}
                      </h2>
                      <p className="text-purple-200">
                        {store.currentTrack.artists.join(', ')}
                      </p>
                      <p className="text-purple-300 text-sm mt-1">
                        {store.currentTrack.album}
                      </p>
                    </div>
                    <Volume2 className="h-8 w-8 text-purple-300 animate-pulse" />
                  </div>
                ) : (
                  <p className="text-purple-200 text-center py-8">Click a track below to start playing</p>
                )}

                {/* Playback Controls */}
                <div className="mt-6 flex items-center justify-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePreviousTrack}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="h-6 w-6" />
                  </Button>
                  
                  <Button
                    size="icon"
                    onClick={handlePlayPause}
                    disabled={isToggling || !store.currentTrack}
                    className="h-14 w-14 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                  >
                    {isToggling ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : store.isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6 ml-1" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextTrack}
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="h-6 w-6" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Playlist */}
            <Card className="bg-white/10 backdrop-blur-md border-purple-300/20">
              <CardHeader>
                <CardTitle className="text-white">Current Playlist</CardTitle>
                <CardDescription className="text-purple-200">
                  {store.currentPlaylist?.name || 'No playlist selected'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {store.currentPlaylist?.tracks.map((track, index) => (
                    <div
                      key={track.id}
                      onClick={() => selectTrack(track, index)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        store.currentTrackIndex === index
                          ? 'bg-purple-600/30 border border-purple-500/50'
                          : 'hover:bg-white/10'
                      }`}
                    >
                      <span className="text-purple-300 font-mono text-sm w-6">
                        {index + 1}
                      </span>
                      {track.image && (
                        <img 
                          src={track.image}
                          alt={track.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{track.name}</p>
                        <p className="text-purple-300 text-sm truncate">
                          {track.artists.join(', ')}
                        </p>
                      </div>
                      <span className="text-purple-300 text-sm">
                        {formatTime(track.duration_ms)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Room Info */}
            <Card className="bg-white/10 backdrop-blur-md border-purple-300/20">
              <CardHeader>
                <CardTitle className="text-white">Room Code</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <code className="flex-1 text-3xl font-bold text-white tracking-wider bg-purple-600/30 rounded-lg p-3 text-center">
                    {store.roomCode}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyRoomCode}
                    className="border-purple-300 text-purple-100 hover:bg-purple-800/50"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {qrCodeUrl && (
                  <div className="flex justify-center">
                    <img src={qrCodeUrl} alt="QR Code" className="rounded-lg" />
                  </div>
                )}
                
                <p className="text-center text-purple-200 text-sm mt-4">
                  Share this code or QR for guests to join
                </p>
                <p className="text-center text-purple-300 text-xs mt-2">
                  Mobile URL: http://192.168.1.66:3000/join
                </p>
              </CardContent>
            </Card>

            {/* Connected Guests */}
            <Card className="bg-white/10 backdrop-blur-md border-purple-300/20">
              <CardHeader>
                <CardTitle className="text-white">Connected Guests</CardTitle>
                <CardDescription className="text-purple-200">
                  {store.connectedGuests} dancing silently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {store.guestList.length > 0 ? (
                    store.guestList.map((guest) => (
                      <motion.div
                        key={guest.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{guest.emoji || '🎵'}</span>
                          <div>
                            <span className="text-white text-sm font-medium">{guest.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <div className={`w-2 h-2 rounded-full ${
                                guest.isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
                              }`} />
                              <span className="text-purple-300 text-xs">
                                {guest.isActive ? 'Connected' : 'Disconnected'}
                              </span>
                            </div>
                          </div>
                        </div>
                        {guest.isActive && (
                          <span className="text-purple-300 text-xs">
                            {guest.latency}ms
                          </span>
                        )}
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-purple-300 text-center py-4">
                      Waiting for guests to join...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}





