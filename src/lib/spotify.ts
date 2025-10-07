const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://192.168.1.66:3000/api/spotify/callback';
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
];

export interface Track {
  id: string;
  name: string;
  artists: string[];
  album: string;
  duration_ms: number;
  uri: string;
  preview_url: string | null;
  image: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  image: string;
  owner: string;
}

class SpotifyService {
  private accessToken: string | null = null;

  async authenticate(): Promise<void> {
    try {
      const authUrl = this.getAuthUrl();
      console.log('Redirecting to Spotify auth:', authUrl);
      window.location.href = authUrl;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  private getAuthUrl(): string {
    // Always use the environment variable or fallback to current IP
    const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://192.168.1.66:3000/api/spotify/callback';
    
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SCOPES.join(' '),
      show_dialog: 'true',
    });

    console.log('Auth params:', {
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      env_redirect: process.env.NEXT_PUBLIC_REDIRECT_URI,
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async handleCallback(code: string): Promise<string> {
    try {
      const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://192.168.1.66:3000/api/spotify/callback';
      console.log('Exchanging code for token with redirect_uri:', redirectUri);
      
      const response = await fetch('/api/spotify/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      });

      const responseText = await response.text();
      console.log('Token exchange response:', response.status, responseText);

      if (!response.ok) {
        console.error('Token exchange failed:', responseText);
        throw new Error(`Failed to exchange code for token: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      if (!data.access_token) {
        throw new Error('No access token in response');
      }

      this.accessToken = data.access_token;
      return data.access_token;
    } catch (error) {
      console.error('Callback handling failed:', error);
      throw error;
    }
  }

  async initializeClient(accessToken: string): Promise<void> {
    this.accessToken = accessToken;
    console.log('Spotify client initialized with token');
  }

  private async spotifyFetch(endpoint: string, options?: RequestInit) {
    if (!this.accessToken) throw new Error('Not authenticated');

    const url = `https://api.spotify.com/v1${endpoint}`;
    console.log('Spotify API request:', url);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Spotify API error:', response.status, errorText);
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getUserPlaylists(): Promise<Playlist[]> {
    try {
      console.log('Fetching user playlists...');
      const data = await this.spotifyFetch('/me/playlists?limit=50');
      const playlists: Playlist[] = [];

      for (const playlist of data.items) {
        if (playlist.tracks.total > 0) {
          const tracks = await this.getPlaylistTracks(playlist.id);
          playlists.push({
            id: playlist.id,
            name: playlist.name,
            tracks,
            image: playlist.images?.[0]?.url || '',
            owner: playlist.owner.display_name || 'Unknown',
          });
        }
      }

      console.log(`Loaded ${playlists.length} playlists`);
      return playlists;
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
      throw error;
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    try {
      const data = await this.spotifyFetch(`/playlists/${playlistId}/tracks?limit=50`);

      return data.items
        .filter((item: any) => item.track && item.track.id)
        .map((item: any) => ({
          id: item.track.id,
          name: item.track.name,
          artists: item.track.artists.map((a: any) => a.name),
          album: item.track.album.name,
          duration_ms: item.track.duration_ms,
          uri: item.track.uri,
          preview_url: item.track.preview_url,
          image: item.track.album.images?.[0]?.url || '',
        }));
    } catch (error) {
      console.error('Failed to fetch playlist tracks:', error);
      throw error;
    }
  }

  async searchTracks(query: string): Promise<Track[]> {
    try {
      const data = await this.spotifyFetch(`/search?q=${encodeURIComponent(query)}&type=track&limit=20`);
      
      return data.tracks.items.map((track: any) => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map((a: any) => a.name),
        album: track.album.name,
        duration_ms: track.duration_ms,
        uri: track.uri,
        preview_url: track.preview_url,
        image: track.album.images?.[0]?.url || '',
      }));
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }
}

export const spotifyService = new SpotifyService();
