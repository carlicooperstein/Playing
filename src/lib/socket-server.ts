import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Track } from './spotify';

export interface RoomData {
  roomCode: string;
  adminId: string;
  adminSocket: string;
  guests: Map<string, GuestData>;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  playlist: Track[];
  createdAt: Date;
  lastActivity: Date;
}

export interface GuestData {
  id: string;
  name: string;
  emoji: string;
  socketId: string;
  joinedAt: Date;
  isActive: boolean;
  latency: number;
}

export interface SyncData {
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  timestamp: number;
}

class DiscoSocketServer {
  private io: SocketIOServer | null = null;
  private rooms: Map<string, RoomData> = new Map();
  private socketToRoom: Map<string, string> = new Map();

  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    this.startCleanupInterval();
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('admin:create-room', (data, callback) => {
        this.handleCreateRoom(socket, data, callback);
      });

      socket.on('admin:update-track', (data) => {
        this.handleUpdateTrack(socket, data);
      });

      socket.on('admin:play-pause', (data) => {
        this.handlePlayPause(socket, data);
      });

      socket.on('admin:sync-time', (data) => {
        this.handleSyncTime(socket, data);
      });

      socket.on('guest:join-room', (data, callback) => {
        this.handleJoinRoom(socket, data, callback);
      });

      socket.on('guest:request-sync', (callback) => {
        this.handleRequestSync(socket, callback);
      });

      socket.on('guest:ping', (callback) => {
        callback({ timestamp: Date.now() });
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleCreateRoom(socket: Socket, data: any, callback: Function) {
    const roomCode = this.generateRoomCode();
    const room: RoomData = {
      roomCode,
      adminId: data.adminId,
      adminSocket: socket.id,
      guests: new Map(),
      currentTrack: data.track || null,
      isPlaying: false,
      currentTime: 0,
      playlist: data.playlist || [],
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.rooms.set(roomCode, room);
    this.socketToRoom.set(socket.id, roomCode);
    socket.join(roomCode);

    callback({ success: true, roomCode });
    console.log(`Room created: ${roomCode} by admin ${data.adminId}`);
  }

  private handleUpdateTrack(socket: Socket, data: any) {
    const roomCode = this.socketToRoom.get(socket.id);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.adminSocket !== socket.id) return;

    room.currentTrack = data.track;
    room.currentTime = 0;
    room.lastActivity = new Date();

    // Broadcast to all guests
    socket.to(roomCode).emit('track:update', {
      track: data.track,
      currentTime: 0,
      timestamp: Date.now(),
    });

    this.updateGuestList(roomCode);
  }

  private handlePlayPause(socket: Socket, data: any) {
    const roomCode = this.socketToRoom.get(socket.id);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.adminSocket !== socket.id) return;

    room.isPlaying = data.isPlaying;
    room.currentTime = data.currentTime;
    room.lastActivity = new Date();

    // Broadcast to all guests with timestamp for synchronization
    socket.to(roomCode).emit('playback:update', {
      isPlaying: data.isPlaying,
      currentTime: data.currentTime,
      timestamp: Date.now(),
    });
  }

  private handleSyncTime(socket: Socket, data: any) {
    const roomCode = this.socketToRoom.get(socket.id);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room || room.adminSocket !== socket.id) return;

    room.currentTime = data.currentTime;
    room.lastActivity = new Date();

    // Periodic sync to keep everyone aligned
    socket.to(roomCode).emit('time:sync', {
      currentTime: data.currentTime,
      timestamp: Date.now(),
    });
  }

  private handleJoinRoom(socket: Socket, data: any, callback: Function) {
    const { roomCode, guestName, guestEmoji } = data;
    const room = this.rooms.get(roomCode);

    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    const guestId = this.generateGuestId();
    const guest: GuestData = {
      id: guestId,
      name: guestName || `Guest ${room.guests.size + 1}`,
      emoji: guestEmoji || '🎵',
      socketId: socket.id,
      joinedAt: new Date(),
      isActive: true,
      latency: 0,
    };

    room.guests.set(guestId, guest);
    room.lastActivity = new Date();
    this.socketToRoom.set(socket.id, roomCode);
    socket.join(roomCode);

    // Send current state to the new guest
    callback({
      success: true,
      guestId,
      syncData: {
        track: room.currentTrack,
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        playlist: room.playlist,
        timestamp: Date.now(),
      },
    });

    // Notify admin of new guest
    this.io?.to(room.adminSocket).emit('guest:joined', {
      guest,
      totalGuests: room.guests.size,
    });

    this.updateGuestList(roomCode);
    console.log(`Guest ${guestId} joined room ${roomCode}`);
  }

  private handleRequestSync(socket: Socket, callback: Function) {
    const roomCode = this.socketToRoom.get(socket.id);
    if (!roomCode) {
      callback({ success: false, error: 'Not in a room' });
      return;
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    callback({
      success: true,
      syncData: {
        track: room.currentTrack,
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        timestamp: Date.now(),
      },
    });
  }

  private handleDisconnect(socket: Socket) {
    const roomCode = this.socketToRoom.get(socket.id);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    if (room.adminSocket === socket.id) {
      // Admin disconnected - end the party
      this.io?.to(roomCode).emit('room:closed', {
        reason: 'Admin disconnected',
      });
      
      // Clean up room
      room.guests.forEach(guest => {
        this.socketToRoom.delete(guest.socketId);
      });
      this.rooms.delete(roomCode);
      console.log(`Room ${roomCode} closed - admin disconnected`);
    } else {
      // Guest disconnected
      let disconnectedGuest: GuestData | undefined;
      room.guests.forEach((guest, guestId) => {
        if (guest.socketId === socket.id) {
          guest.isActive = false;
          disconnectedGuest = guest;
        }
      });

      if (disconnectedGuest) {
        // Notify admin
        this.io?.to(room.adminSocket).emit('guest:left', {
          guestId: disconnectedGuest.id,
          totalGuests: Array.from(room.guests.values()).filter(g => g.isActive).length,
        });

        this.updateGuestList(roomCode);
      }
    }

    this.socketToRoom.delete(socket.id);
  }

  private updateGuestList(roomCode: string) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const guestList = Array.from(room.guests.values());
    this.io?.to(room.adminSocket).emit('guests:update', { guestList });
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private generateGuestId(): string {
    return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startCleanupInterval() {
    // Clean up inactive rooms every 30 minutes
    setInterval(() => {
      const now = new Date();
      const maxInactivity = 2 * 60 * 60 * 1000; // 2 hours

      this.rooms.forEach((room, roomCode) => {
        if (now.getTime() - room.lastActivity.getTime() > maxInactivity) {
          console.log(`Cleaning up inactive room: ${roomCode}`);
          
          // Notify any remaining connections
          this.io?.to(roomCode).emit('room:closed', {
            reason: 'Room expired due to inactivity',
          });

          // Clean up
          room.guests.forEach(guest => {
            this.socketToRoom.delete(guest.socketId);
          });
          this.socketToRoom.delete(room.adminSocket);
          this.rooms.delete(roomCode);
        }
      });
    }, 30 * 60 * 1000);
  }
}

export const discoSocketServer = new DiscoSocketServer();




