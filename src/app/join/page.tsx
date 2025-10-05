'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Headphones, Wifi, WifiOff, Music, Play, Pause,
  Volume2, Loader2, AlertCircle, CheckCircle,
  Users, Radio, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDiscoStore } from '@/store/disco-store';
import { discoSocketClient } from '@/lib/socket-client';
import { useSearchParams } from 'next/navigation';

function JoinPartyContent() {
  const store = useDiscoStore();
  const searchParams = useSearchParams();
  const [roomCode, setRoomCode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎵');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const partyEmojis = [
    '🎵', '🎶', '🎧', '🎤', '🎸', '🎹', '🎺', '🎷',
    '🕺', '💃', '🪩', '🎉', '🎊', '✨', '🌟', '⭐',
    '🔥', '💫', '🌈', '🦄', '🐼', '🦋', '🌺', '🌸',
    '😎', '🤩', '😍', '🥳', '🤗', '😊', '🙌', '👾'
  ];

  useEffect(() => {
    // Check URL params for room code
    const urlRoomCode = searchParams.get('room');
    if (urlRoomCode) {
      // Set the room code in state
      setRoomCode(urlRoomCode);
      
      // Also fill the individual input fields
      urlRoomCode.split('').forEach((char, i) => {
        if (codeInputRefs.current[i]) {
          codeInputRefs.current[i]!.value = char.toUpperCase();
        }
      });
    }

    // Initialize socket connection
    discoSocketClient.connect();

    return () => {
      discoSocketClient.disconnect();
    };
  }, [searchParams]);

  const handleCodeInput = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const fullCode = value.slice(0, 6).toUpperCase();
      setRoomCode(fullCode);
      
      // Fill all inputs
      fullCode.split('').forEach((char, i) => {
        if (codeInputRefs.current[i]) {
          codeInputRefs.current[i]!.value = char;
        }
      });
      
      // Focus last input or next empty
      const nextIndex = Math.min(fullCode.length, 5);
      codeInputRefs.current[nextIndex]?.focus();
    } else {
      // Single character input
      const newCode = roomCode.split('');
      newCode[index] = value.toUpperCase();
      setRoomCode(newCode.join(''));

      // Auto-focus next input
      if (value && index < 5) {
        codeInputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codeInputRefs.current[index]?.value && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const joinRoom = async () => {
    if (roomCode.length !== 6) {
      setError('Please enter a valid 6-character room code');
      return;
    }
    
    if (!guestName.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      setIsJoining(true);
      setError(null);
      
      await discoSocketClient.joinRoom(roomCode, guestName.trim(), selectedEmoji);
      
      // Successfully joined
      console.log('Joined room successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const handlePlayPause = () => {
    // Guest cannot control playback, this is just for UI feedback
    const newState = !store.isPlaying;
    store.setIsPlaying(newState);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle click to resume audio context on mobile
  const handlePlayerClick = () => {
    // This helps with mobile autoplay restrictions
    const audioContext = (window as any).audioContext;
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  };

  // If not connected yet
  if (!store.isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <Card className="bg-white/10 backdrop-blur-md border-purple-300/20">
            <CardHeader className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
              >
                <Headphones className="w-10 h-10 text-white" />
              </motion.div>
              <CardTitle className="text-2xl text-white">Join the Silent Disco</CardTitle>
              <CardDescription className="text-purple-200">
                Enter the room code to start vibing
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Room Code Input */}
              <div>
                <label className="text-sm text-purple-200 mb-2 block">Room Code</label>
                <div className="flex gap-2 justify-center">
                  {[...Array(6)].map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        codeInputRefs.current[i] = el;
                      }}
                      type="text"
                      maxLength={1}
                      className="w-12 h-12 text-center text-xl font-bold bg-white/10 border border-purple-300/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onChange={(e) => handleCodeInput(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onFocus={(e) => e.target.select()}
                    />
                  ))}
                </div>
              </div>

              {/* Guest Name */}
              <div>
                <label className="text-sm text-purple-200 mb-2 block">Your Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-2 bg-white/10 border border-purple-300/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {/* Emoji Picker */}
              <div>
                <label className="text-sm text-purple-200 mb-2 block">Choose Your Avatar</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-full px-4 py-3 bg-white/10 border border-purple-300/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-between"
                  >
                    <span className="text-2xl">{selectedEmoji}</span>
                    <span className="text-purple-200">Click to change</span>
                  </button>
                  
                  {showEmojiPicker && (
                    <div className="absolute z-10 w-full mt-2 p-3 bg-purple-900/95 backdrop-blur-md border border-purple-300/30 rounded-lg shadow-xl">
                      <div className="grid grid-cols-8 gap-2">
                        {partyEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setSelectedEmoji(emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="text-2xl p-2 hover:bg-white/20 rounded transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>


              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-sm text-red-200 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </p>
                </div>
              )}

              {/* Join Button */}
              <Button
                onClick={joinRoom}
                disabled={isJoining || roomCode.length !== 6 || !guestName.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Radio className="mr-2 h-4 w-4" />
                    Join Party
                  </>
                )}
              </Button>

              {/* Instructions */}
              <div className="pt-4 border-t border-purple-300/20">
                <p className="text-xs text-purple-200 text-center">
                  Make sure your AirPods or headphones are connected to your device
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Connected - Show player
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Connection Status */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Silent Disco</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-lg px-4 py-2">
              <Wifi className="h-5 w-5 text-green-400" />
              <span className="text-white">Connected</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-lg px-4 py-2">
              <Users className="h-5 w-5 text-purple-300" />
              <span className="text-white">{store.connectedGuests} vibing</span>
            </div>
          </div>
        </div>

        {/* Main Player */}
        <Card 
          className="bg-white/10 backdrop-blur-md border-purple-300/20 cursor-pointer"
          onClick={handlePlayerClick}
        >
          <CardContent className="p-8">
            {store.currentTrack ? (
              <>
                {/* Track Info */}
                <div className="flex flex-col items-center text-center mb-8">
                  {store.currentTrack.image && (
                    <motion.img
                      src={store.currentTrack.image}
                      alt={store.currentTrack.name}
                      className="w-48 h-48 rounded-2xl object-cover mb-6 shadow-2xl"
                      animate={{
                        scale: store.isPlaying ? [1, 1.05, 1] : 1,
                      }}
                      transition={{
                        duration: 2,
                        repeat: store.isPlaying ? Infinity : 0,
                      }}
                    />
                  )}
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {store.currentTrack.name}
                  </h2>
                  <p className="text-xl text-purple-200 mb-1">
                    {store.currentTrack.artists.join(', ')}
                  </p>
                  <p className="text-purple-300">
                    {store.currentTrack.album}
                  </p>
                </div>

                {/* Visualizer */}
                <div className="flex items-center justify-center gap-1 mb-8">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-1 bg-gradient-to-t from-purple-600 to-pink-500 rounded-full"
                      animate={{
                        height: store.isPlaying ? [10, Math.random() * 40 + 10, 10] : 10,
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: store.isPlaying ? Infinity : 0,
                        delay: i * 0.05,
                      }}
                    />
                  ))}
                </div>

                {/* Playback Status */}
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                    store.isPlaying ? 'bg-green-500/20' : 'bg-gray-500/20'
                  }`}>
                    {store.isPlaying ? (
                      <>
                        <Volume2 className="h-5 w-5 text-green-400 animate-pulse" />
                        <span className="text-green-300">Playing</span>
                      </>
                    ) : (
                      <>
                        <Pause className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-300">Paused</span>
                      </>
                    )}
                  </div>
                  <div className="text-purple-200">
                    {formatTime(store.currentTime * 1000)} / {formatTime(store.currentTrack.duration_ms)}
                  </div>
                </div>

                {/* Connected Guests */}
                <div className="mt-6 p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-purple-300" />
                    <span className="text-sm text-purple-200">Party Members ({store.guestList.filter(g => g.isActive).length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {store.guestList.filter(g => g.isActive).map((guest) => (
                      <motion.div
                        key={guest.id}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 rounded-full"
                      >
                        <span className="text-lg">{guest.emoji || '🎵'}</span>
                        <span className="text-xs text-white">{guest.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 text-purple-300 animate-spin mx-auto mb-4" />
                <p className="text-purple-200">Waiting for DJ to start the party...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Card className="bg-white/5 backdrop-blur-md border-purple-300/10">
            <CardContent className="p-4 text-center">
              <Headphones className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-purple-200">Make sure your headphones are connected</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-md border-purple-300/10">
            <CardContent className="p-4 text-center">
              <Sparkles className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-purple-200">You're synced with everyone in the party</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 backdrop-blur-md border-purple-300/10">
            <CardContent className="p-4 text-center">
              <Music className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <p className="text-sm text-purple-200">DJ controls the music for everyone</p>
            </CardContent>
          </Card>
        </div>

        {/* Connection Error */}
        {store.connectionError && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <Card className="bg-red-500/20 border-red-500/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <WifiOff className="h-5 w-5 text-red-400" />
                  <p className="text-red-200">{store.connectionError}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function JoinParty() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    }>
      <JoinPartyContent />
    </Suspense>
  );
}




