import io, { Socket } from 'socket.io-client';
import { Track } from './spotify';
import { useDiscoStore } from '@/store/disco-store';
import { spotifyPlayer, checkSpotifyPremium } from './spotify-player';

class DiscoSocketClient {
  private socket: Socket | null = null;
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private latencyCheckInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private useSpotifyPlayer: boolean = false;
  private spotifyDeviceId: string | null = null;

  connect(serverUrl?: string) {
    const url = serverUrl || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
    
    this.socket = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventHandlers();
    this.initializeAudio();
    this.startLatencyCheck();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    const store = useDiscoStore.getState();

    this.socket.on('connect', () => {
      console.log('Socket connected to disco server');
      // Don't set connection status here - only set it after joining a room
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from disco server');
      store.setConnectionStatus(false, 'Connection lost');
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        store.setConnectionStatus(false, 'Failed to connect to server');
      }
    });

    // Guest events
    this.socket.on('track:update', (data) => {
      console.log('Guest received track update:', data.track?.name);
      this.handleTrackUpdate(data);
    });

    this.socket.on('playback:update', (data) => {
      console.log('Guest received playback update - isPlaying:', data.isPlaying, 'currentTime:', data.currentTime);
      this.handlePlaybackUpdate(data);
    });

    this.socket.on('time:sync', (data) => {
      this.handleTimeSync(data);
    });

    this.socket.on('room:closed', (data) => {
      this.handleRoomClosed(data);
    });

    // Admin events
    this.socket.on('guest:joined', (data) => {
      console.log('Guest joined:', data);
    });

    this.socket.on('guest:left', (data) => {
      console.log('Guest left:', data);
    });

    this.socket.on('guests:update', (data) => {
      console.log('Received guest list update:', data.guestList);
      store.updateGuestList(data.guestList);
    });
  }

  private initializeAudio() {
    if (typeof window === 'undefined') return;

    try {
      // Create audio element first (simpler approach for better compatibility)
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.volume = 1.0; // Ensure volume is at max
      this.audioElement.preload = 'auto'; // Preload audio for better performance
      
      // Create audio context but don't connect it yet (to avoid autoplay issues)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Handle audio element events
      this.audioElement.addEventListener('ended', () => {
        const store = useDiscoStore.getState();
        if (store.isAdmin) {
          store.nextTrack();
          if (store.currentTrack) {
            this.updateTrack(store.currentTrack);
          }
        }
      });
      
      // Add error handler
      this.audioElement.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        const store = useDiscoStore.getState();
        store.setConnectionStatus(true, 'Audio error - please refresh');
      });
      
      // Add play handler to resume context if needed
      this.audioElement.addEventListener('play', () => {
        if (this.audioContext?.state === 'suspended') {
          this.audioContext.resume();
        }
      });
      
      console.log('Audio initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  private startLatencyCheck() {
    this.latencyCheckInterval = setInterval(() => {
      if (!this.socket?.connected) return;

      const startTime = Date.now();
      this.socket.emit('guest:ping', (response: any) => {
        const latency = Date.now() - startTime;
        // Store latency for synchronization adjustments
        const store = useDiscoStore.getState();
        store.audioLatency = latency;
      });
    }, 5000);
  }

  // Admin methods
  async createRoom(adminId: string, playlist: Track[]): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      const firstTrack = playlist[0] || null;
      console.log('Creating room with first track:', firstTrack?.name);
      
      this.socket.emit('admin:create-room', 
        { adminId, playlist, track: firstTrack },
        (response: any) => {
          if (response.success) {
            const store = useDiscoStore.getState();
            store.setRoomCode(response.roomCode);
            
            // Load the first track on admin side
            if (firstTrack) {
              this.loadTrack(firstTrack);
            }
            
            resolve(response.roomCode);
          } else {
            reject(new Error(response.error || 'Failed to create room'));
          }
        }
      );
    });
  }

  updateTrack(track: Track) {
    if (!this.socket) return;
    
    console.log('Admin updating track:', track.name);
    this.socket.emit('admin:update-track', { track });
    
    // Load the track on admin side
    this.loadTrack(track);
    
    // If already playing, start the new track
    const store = useDiscoStore.getState();
    if (store.isPlaying && this.audioElement) {
      this.audioElement.play().catch(error => {
        console.error('Failed to play after track update:', error);
      });
    }
  }

  async togglePlayback(isPlaying: boolean, currentTime: number) {
    if (!this.socket) return;

    console.log('Admin toggling playback:', isPlaying ? 'PLAY' : 'PAUSE', 'at time:', currentTime);
    console.log('useSpotifyPlayer:', this.useSpotifyPlayer, 'deviceId:', this.spotifyDeviceId);
    
    // Emit to guests immediately
    this.socket.emit('admin:play-pause', { isPlaying, currentTime });
    
    // Handle audio playback asynchronously to not block UI
    if (this.useSpotifyPlayer && this.spotifyDeviceId) {
      const store = useDiscoStore.getState();
      const track = store.currentTrack;
      
      if (!track || !track.uri) {
        console.error('No track or URI available for Spotify Player');
        this.fallbackToPreview(isPlaying, currentTime);
        return;
      }
      
      // Use Spotify Web Player for full songs
      console.log('🎵 Using Spotify Web Player for playback control');
      if (isPlaying) {
        try {
          // First ensure the track is loaded on the Spotify device
          await spotifyPlayer.playTrack(track.uri, currentTime * 1000); // Convert to ms
          console.log('✅ Started full song playback via Spotify Web Player');
        } catch (error) {
          console.error('Spotify player failed to play:', error);
          this.fallbackToPreview(isPlaying, currentTime);
        }
      } else {
        try {
          await spotifyPlayer.pause();
          console.log('⏸️ Paused Spotify Web Player');
        } catch (error) {
          console.error('Spotify player failed to pause:', error);
        }
      }
    } else {
      // Use preview URLs
      console.log('Using preview URL fallback');
      this.fallbackToPreview(isPlaying, currentTime);
    }
  }

  private fallbackToPreview(isPlaying: boolean, currentTime: number) {
    if (!this.audioElement) {
      console.error('Audio element not initialized for admin');
      return;
    }

    // Ensure track is loaded
    const store = useDiscoStore.getState();
    if (!this.audioElement.src && store.currentTrack?.preview_url) {
      console.log('Loading track before playback');
      this.loadTrack(store.currentTrack);
    }
    
    if (isPlaying) {
      this.audioElement.currentTime = currentTime;
      console.log('Admin playing audio (preview)');
      this.audioElement.play().catch(error => {
        console.error('Admin failed to play preview:', error);
      });
    } else {
      console.log('Admin pausing audio');
      this.audioElement.pause();
    }
  }

  syncTime(currentTime: number) {
    if (!this.socket) return;
    this.socket.emit('admin:sync-time', { currentTime });
  }

  // Guest methods
  async joinRoom(roomCode: string, guestName?: string, guestEmoji?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('Guest attempting to join room:', roomCode, 'with name:', guestName, 'and emoji:', guestEmoji);
      
      this.socket.emit('guest:join-room', 
        { roomCode, guestName, guestEmoji },
        (response: any) => {
          console.log('Join room response:', response);
          
          if (response.success) {
            const store = useDiscoStore.getState();
            store.setGuestId(response.guestId);
            store.setRoomCode(roomCode);
            
            // CRITICAL: Mark guest as connected to show the player UI
            store.setConnectionStatus(true);
            
            // Apply initial sync data
            if (response.syncData) {
              this.applySyncData(response.syncData);
            }
            
            console.log('Guest successfully joined room:', roomCode, 'as:', response.guestId);
            resolve();
          } else {
            console.error('Failed to join room:', response.error);
            reject(new Error(response.error || 'Failed to join room'));
          }
        }
      );
    });
  }

  requestSync() {
    if (!this.socket) return;

    this.socket.emit('guest:request-sync', (response: any) => {
      if (response.success && response.syncData) {
        this.applySyncData(response.syncData);
      }
    });
  }

  // Playback handling
  private handleTrackUpdate(data: any) {
    const store = useDiscoStore.getState();
    store.setCurrentTrack(data.track);
    store.setCurrentTime(0);
    
    if (data.track) {
      this.playTrack(data.track);
    }
  }

  private async handlePlaybackUpdate(data: any) {
    const store = useDiscoStore.getState();
    const latencyCompensation = store.audioLatency / 1000; // Convert to seconds
    
    console.log('Guest received playback update:', data);
    
    // Update track if provided in the playback update
    if (data.track) {
      console.log('Updating track from playback update:', data.track.name);
      store.setCurrentTrack(data.track);
    }
    
    console.log('Current track:', store.currentTrack?.name);
    console.log('Audio element exists:', !!this.audioElement);
    console.log('Audio src:', this.audioElement?.src);
    
    store.setIsPlaying(data.isPlaying);
    store.setCurrentTime(data.currentTime);

    if (!this.audioElement) {
      console.error('No audio element! Initializing...');
      this.initializeAudio();
    }

    if (this.audioElement && store.currentTrack?.preview_url) {
      // Check if audio source is loaded
      if (!this.audioElement.src || this.audioElement.src !== store.currentTrack.preview_url) {
        console.log('Loading/updating track for guest:', store.currentTrack.name);
        // Load the track if not already loaded or if it's different
        this.audioElement.src = store.currentTrack.preview_url;
        this.audioElement.load();
        this.audioElement.volume = 1.0;
      }
      
      if (data.isPlaying) {
        const adjustedTime = data.currentTime + latencyCompensation;
        
        // Try to play immediately if audio is ready
        if (this.audioElement.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
          this.audioElement.currentTime = adjustedTime;
          console.log('Guest starting playback immediately at:', adjustedTime);
          try {
            await this.audioElement.play();
            console.log('Playback started successfully');
          } catch (error) {
            console.error('Failed to play audio:', error);
            store.setConnectionStatus(true, 'Tap anywhere to start audio');
          }
        } else {
          // Wait for audio to be ready
          console.log('Waiting for audio to be ready...');
          this.audioElement.addEventListener('canplay', async () => {
            this.audioElement!.currentTime = adjustedTime;
            console.log('Audio ready, starting playback at:', adjustedTime);
            try {
              await this.audioElement!.play();
              console.log('Playback started successfully after waiting');
            } catch (error) {
              console.error('Failed to play audio after waiting:', error);
              store.setConnectionStatus(true, 'Tap anywhere to start audio');
            }
          }, { once: true });
        }
      } else {
        console.log('Guest pausing playback');
        this.audioElement.pause();
      }
    } else {
      console.error('Missing audio element or track preview URL');
    }
  }

  private handleTimeSync(data: any) {
    const store = useDiscoStore.getState();
    const latencyCompensation = store.audioLatency / 1000;
    
    if (this.audioElement && store.isPlaying) {
      const targetTime = data.currentTime + latencyCompensation;
      const currentTime = this.audioElement.currentTime;
      
      // Only adjust if drift is significant (> 0.5 seconds)
      if (Math.abs(targetTime - currentTime) > 0.5) {
        this.audioElement.currentTime = targetTime;
      }
    }
    
    store.setCurrentTime(data.currentTime);
  }

  private handleRoomClosed(data: any) {
    const store = useDiscoStore.getState();
    store.setConnectionStatus(false, data.reason || 'Room closed');
    store.reset();
    
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }
  }

  private applySyncData(syncData: any) {
    console.log('Guest applying sync data:', syncData);
    const store = useDiscoStore.getState();
    
    if (syncData.track) {
      console.log('Guest loading track:', syncData.track.name);
      store.setCurrentTrack(syncData.track);
      
      // Load the track immediately for guests
      if (this.audioElement && syncData.track.preview_url) {
        this.audioElement.src = syncData.track.preview_url;
        this.audioElement.load();
        this.audioElement.volume = 1.0;
        console.log('Guest loaded preview URL:', syncData.track.preview_url);
        
        // If already playing, start playback once loaded
        if (syncData.isPlaying) {
          this.audioElement.addEventListener('canplay', () => {
            this.audioElement!.currentTime = syncData.currentTime;
            console.log('Guest auto-starting playback at:', syncData.currentTime);
            this.audioElement!.play().catch(error => {
              console.error('Failed to auto-start playback:', error);
              store.setConnectionStatus(true, 'Tap to start audio');
            });
          }, { once: true });
        }
      }
    }
    
    store.setIsPlaying(syncData.isPlaying);
    store.setCurrentTime(syncData.currentTime);
  }

  private async loadTrack(track: Track) {
    console.log('loadTrack called with:', track?.name, 'URI:', track?.uri, 'useSpotifyPlayer:', this.useSpotifyPlayer);
    
    // Try to use Spotify Web Player for full songs if available
    if (this.useSpotifyPlayer && this.spotifyDeviceId && track.uri) {
      try {
        console.log('🎵 Using Spotify Web Player for FULL SONG playback');
        console.log('Device ID:', this.spotifyDeviceId);
        console.log('Track URI:', track.uri);
        
        // Don't auto-play when loading, just prepare the track
        // Playback will be controlled by togglePlayback
        return;
      } catch (error) {
        console.error('Failed to use Spotify Player, falling back to preview:', error);
        this.useSpotifyPlayer = false;
        this.spotifyDeviceId = null;
      }
    }
    
    // Fallback to preview URLs
    console.log('⚠️ Falling back to preview URL mode');
    if (!this.audioElement) {
      console.error('Audio element not initialized');
      this.initializeAudio();
    }

    if (track.preview_url) {
      console.log('Using preview URL (30-second clip):', track.preview_url);
      this.audioElement!.src = track.preview_url;
      this.audioElement!.load();
      this.audioElement!.volume = 1.0;
    } else {
      console.warn('Track has no preview URL and Spotify Player not available:', track.name);
    }
  }
  
  private playTrack(track: Track) {
    this.loadTrack(track);
    
    const store = useDiscoStore.getState();
    if (store.isPlaying && this.audioElement) {
      console.log('Auto-playing track');
      this.audioElement.play().catch(error => {
        console.error('Failed to auto-play:', error);
      });
    }
  }

  // Initialize Spotify Web Player for full songs (admin only)
  async initializeSpotifyPlayer(token: string): Promise<boolean> {
    try {
      console.log('🎵 Initializing Spotify Web Player...');
      
      // Check if user has Spotify Premium
      const hasPremium = await checkSpotifyPremium(token);
      console.log('Premium status:', hasPremium);
      
      if (!hasPremium) {
        console.warn('❌ Spotify Premium required for full playback. Using 30-second previews.');
        this.useSpotifyPlayer = false;
        this.spotifyDeviceId = null;
        return false;
      }

      // Initialize the Spotify Web Player
      console.log('Initializing Spotify Web Player SDK...');
      const deviceId = await spotifyPlayer.initialize(token);
      
      this.spotifyDeviceId = deviceId;
      this.useSpotifyPlayer = true;
      
      console.log('✅ Spotify Web Player initialized successfully!');
      console.log('Device ID:', deviceId);
      console.log('Full songs are now available!');
      
      // Make this the global player reference for debugging
      (window as any).spotifyPlayer = spotifyPlayer;
      (window as any).discoSocketClient = this;
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Spotify Player:', error);
      this.useSpotifyPlayer = false;
      this.spotifyDeviceId = null;
      return false;
    }
  }

  // Start sync interval for admin
  startAdminSync() {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      if (this.audioElement && !this.audioElement.paused) {
        this.syncTime(this.audioElement.currentTime);
      }
    }, 2000); // Sync every 2 seconds
  }

  stopAdminSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.latencyCheckInterval) {
      clearInterval(this.latencyCheckInterval);
      this.latencyCheckInterval = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const discoSocketClient = new DiscoSocketClient();




