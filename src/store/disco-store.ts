import { create } from 'zustand';
import { Track, Playlist } from '@/lib/spotify';

export interface DiscoState {
  // Admin state
  isAdmin: boolean;
  adminId: string | null;
  accessToken: string | null;
  
  // Playlist state
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  currentTrack: Track | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  currentTime: number;
  
  // Guest state
  guestId: string | null;
  isConnected: boolean;
  connectionError: string | null;
  audioLatency: number;
  
  // Room state
  roomCode: string | null;
  connectedGuests: number;
  guestList: Guest[];
  
  // Actions
  setAdmin: (isAdmin: boolean, adminId?: string) => void;
  setAccessToken: (token: string | null) => void;
  setPlaylists: (playlists: Playlist[]) => void;
  setCurrentPlaylist: (playlist: Playlist | null) => void;
  setCurrentTrack: (track: Track | null, index?: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setGuestId: (id: string) => void;
  setConnectionStatus: (connected: boolean, error?: string) => void;
  setRoomCode: (code: string | null) => void;
  updateGuestList: (guests: Guest[]) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  reset: () => void;
}

export interface Guest {
  id: string;
  name: string;
  emoji: string;
  joinedAt: Date;
  isActive: boolean;
  latency: number;
}

const initialState = {
  isAdmin: false,
  adminId: null,
  accessToken: null,
  playlists: [],
  currentPlaylist: null,
  currentTrack: null,
  currentTrackIndex: 0,
  isPlaying: false,
  currentTime: 0,
  guestId: null,
  isConnected: false,
  connectionError: null,
  audioLatency: 0,
  roomCode: null,
  connectedGuests: 0,
  guestList: [],
};

export const useDiscoStore = create<DiscoState>((set, get) => ({
  ...initialState,
  
  setAdmin: (isAdmin, adminId) => 
    set({ isAdmin, adminId: adminId || null }),
  
  setAccessToken: (accessToken) => 
    set({ accessToken }),
  
  setPlaylists: (playlists) => 
    set({ playlists }),
  
  setCurrentPlaylist: (currentPlaylist) => 
    set({ currentPlaylist, currentTrackIndex: 0, currentTrack: currentPlaylist?.tracks[0] || null }),
  
  setCurrentTrack: (currentTrack, index) => 
    set({ currentTrack, currentTrackIndex: index !== undefined ? index : get().currentTrackIndex }),
  
  setIsPlaying: (isPlaying) => 
    set({ isPlaying }),
  
  setCurrentTime: (currentTime) => 
    set({ currentTime }),
  
  setGuestId: (guestId) => 
    set({ guestId }),
  
  setConnectionStatus: (isConnected, error) => 
    set({ isConnected, connectionError: error || null }),
  
  setRoomCode: (roomCode) => 
    set({ roomCode }),
  
  updateGuestList: (guestList) => 
    set({ guestList, connectedGuests: guestList.filter(g => g.isActive).length }),
  
  nextTrack: () => {
    const state = get();
    if (!state.currentPlaylist) return;
    
    const nextIndex = (state.currentTrackIndex + 1) % state.currentPlaylist.tracks.length;
    const nextTrack = state.currentPlaylist.tracks[nextIndex];
    
    set({ 
      currentTrack: nextTrack, 
      currentTrackIndex: nextIndex,
      currentTime: 0 
    });
  },
  
  previousTrack: () => {
    const state = get();
    if (!state.currentPlaylist) return;
    
    const prevIndex = state.currentTrackIndex === 0 
      ? state.currentPlaylist.tracks.length - 1 
      : state.currentTrackIndex - 1;
    const prevTrack = state.currentPlaylist.tracks[prevIndex];
    
    set({ 
      currentTrack: prevTrack, 
      currentTrackIndex: prevIndex,
      currentTime: 0 
    });
  },
  
  reset: () => set(initialState),
}));


