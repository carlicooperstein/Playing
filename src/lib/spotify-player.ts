// Spotify Web Playback SDK for full song streaming
// Requires Spotify Premium account

/// <reference types="@types/spotify-web-playback-sdk" />

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifyPlayer {
  device_id: string;
  player: Spotify.Player | null;
  isReady: boolean;
}

class SpotifyWebPlayer {
  private player: Spotify.Player | null = null;
  private deviceId: string | null = null;
  private isReady: boolean = false;
  private token: string | null = null;
  private onReadyCallbacks: (() => void)[] = [];
  private volume: number = 1.0;

  initialize(token: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.token = token;
      console.log('Initializing Spotify Web Player with token...');

      // Function to create player when SDK is ready
      const initPlayer = () => {
        if (window.Spotify && window.Spotify.Player) {
          console.log('Spotify SDK is ready, creating player...');
          this.createPlayer(token, resolve, reject);
        } else {
          console.error('Spotify SDK not fully loaded');
          reject(new Error('Spotify SDK not available'));
        }
      };

      // Check if SDK is already loaded
      if (window.Spotify && window.Spotify.Player) {
        console.log('Spotify SDK already loaded');
        initPlayer();
      } else {
        console.log('Waiting for Spotify SDK to load...');
        // Set up the callback for when SDK loads
        window.onSpotifyWebPlaybackSDKReady = () => {
          console.log('Spotify SDK ready callback fired');
          initPlayer();
        };
        
        // Also try loading after a delay as fallback
        setTimeout(() => {
          if (window.Spotify && window.Spotify.Player) {
            console.log('Spotify SDK loaded after delay');
            initPlayer();
          } else {
            console.error('Spotify SDK failed to load after 3 seconds');
            reject(new Error('Spotify SDK failed to load'));
          }
        }, 3000);
      }
    });
  }

  private createPlayer(token: string, resolve: (deviceId: string) => void, reject: (error: any) => void) {
    console.log('Creating Spotify Web Player...');
    
    this.player = new window.Spotify.Player({
      name: 'Silent Disco DJ Controller',
      getOAuthToken: (cb: (token: string) => void) => {
        cb(token);
      },
      volume: this.volume,
    });

    // Error handling
    this.player.addListener('initialization_error', ({ message }) => {
      console.error('Failed to initialize player:', message);
      reject(new Error(message));
    });

    this.player.addListener('authentication_error', ({ message }) => {
      console.error('Authentication failed:', message);
      reject(new Error(message));
    });

    this.player.addListener('account_error', ({ message }) => {
      console.error('Account error (Premium required):', message);
      reject(new Error('Spotify Premium is required for full song playback'));
    });

    this.player.addListener('playback_error', ({ message }) => {
      console.error('Playback error:', message);
    });

    // Ready
    this.player.addListener('ready', ({ device_id }) => {
      console.log('Spotify Player Ready with Device ID:', device_id);
      this.deviceId = device_id;
      this.isReady = true;
      
      // Execute any pending callbacks
      this.onReadyCallbacks.forEach(cb => cb());
      this.onReadyCallbacks = [];
      
      resolve(device_id);
    });

    // Not Ready
    this.player.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline:', device_id);
      this.isReady = false;
    });

    // Player state changed
    this.player.addListener('player_state_changed', (state) => {
      if (!state) return;
      
      console.log('Player state changed:', {
        paused: state.paused,
        position: state.position,
        duration: state.duration,
        track: state.track_window.current_track?.name,
      });

      // Emit state to socket for synchronization
      this.emitPlaybackState(state);
    });

    // Connect to the player
    this.player.connect().then((success: boolean) => {
      if (success) {
        console.log('Successfully connected to Spotify!');
      } else {
        reject(new Error('Failed to connect to Spotify'));
      }
    });
  }

  private emitPlaybackState(state: Spotify.PlaybackState) {
    // Log the playback state for debugging
    console.log('Spotify playback state:', {
      isPlaying: !state.paused,
      position: state.position,
      duration: state.duration,
      trackName: state.track_window.current_track?.name,
    });
    
    // Store the current state for reference
    // The actual sync is handled by the admin's sync interval
    if (typeof window !== 'undefined') {
      (window as any).spotifyPlaybackState = state;
    }
  }

  // Play a specific track by URI
  async playTrack(spotifyUri: string, positionMs: number = 0): Promise<void> {
    if (!this.player || !this.deviceId || !this.token) {
      throw new Error('Player not initialized');
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [spotifyUri],
          position_ms: positionMs,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to play track: ${error}`);
      }

      console.log('Playing track:', spotifyUri);
    } catch (error) {
      console.error('Error playing track:', error);
      throw error;
    }
  }

  // Play a full playlist
  async playPlaylist(spotifyPlaylistUri: string, trackIndex: number = 0): Promise<void> {
    if (!this.player || !this.deviceId || !this.token) {
      throw new Error('Player not initialized');
    }

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context_uri: spotifyPlaylistUri,
          offset: { position: trackIndex },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to play playlist: ${error}`);
      }

      console.log('Playing playlist:', spotifyPlaylistUri);
    } catch (error) {
      console.error('Error playing playlist:', error);
      throw error;
    }
  }

  // Control methods
  async play(): Promise<void> {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.resume();
  }

  async pause(): Promise<void> {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.pause();
  }

  async seek(positionMs: number): Promise<void> {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.seek(positionMs);
  }

  async setVolume(volume: number): Promise<void> {
    if (!this.player) throw new Error('Player not initialized');
    this.volume = Math.max(0, Math.min(1, volume));
    await this.player.setVolume(this.volume);
  }

  async nextTrack(): Promise<void> {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.nextTrack();
  }

  async previousTrack(): Promise<void> {
    if (!this.player) throw new Error('Player not initialized');
    await this.player.previousTrack();
  }

  // Get current state
  async getCurrentState(): Promise<Spotify.PlaybackState | null> {
    if (!this.player) return null;
    return await this.player.getCurrentState();
  }

  // Disconnect player
  disconnect(): void {
    if (this.player) {
      this.player.disconnect();
      this.player = null;
      this.deviceId = null;
      this.isReady = false;
    }
  }

  // Check if player is ready
  getIsReady(): boolean {
    return this.isReady;
  }

  // Get device ID
  getDeviceId(): string | null {
    return this.deviceId;
  }

  // Wait for player to be ready
  onReady(callback: () => void): void {
    if (this.isReady) {
      callback();
    } else {
      this.onReadyCallbacks.push(callback);
    }
  }
}

// Export singleton instance
export const spotifyPlayer = new SpotifyWebPlayer();

// Helper to check if user has Spotify Premium
export async function checkSpotifyPremium(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.product === 'premium';
  } catch (error) {
    console.error('Error checking Spotify Premium:', error);
    return false;
  }
}
