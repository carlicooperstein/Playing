const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);

console.log('=================================');
console.log('Starting Silent Disco Server');
console.log('=================================');
console.log('Environment:', dev ? 'development' : 'production');
console.log('Port:', port);
console.log('Node version:', process.version);

const app = next({ dev });
const handle = app.getRequestHandler();

// Room management
const rooms = new Map();
const socketToRoom = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateGuestId() {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

app.prepare()
  .then(() => {
    console.log('Next.js app prepared successfully');
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Configure CORS for production
  const corsOrigin = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_SOCKET_URL || process.env.RAILWAY_STATIC_URL
    : '*';

  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('admin:create-room', (data, callback) => {
      const roomCode = generateRoomCode();
      const room = {
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

      rooms.set(roomCode, room);
      socketToRoom.set(socket.id, roomCode);
      socket.join(roomCode);

      callback({ success: true, roomCode });
      console.log(`Room created: ${roomCode} by admin ${data.adminId}`);
    });

    socket.on('admin:update-track', (data) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || room.adminSocket !== socket.id) return;

      room.currentTrack = data.track;
      room.currentTime = 0;
      room.lastActivity = new Date();

      console.log(`Admin updating track in room ${roomCode}: ${data.track?.name}`);
      console.log(`Broadcasting to ${room.guests.size} guests`);

      socket.to(roomCode).emit('track:update', {
        track: data.track,
        currentTime: 0,
        timestamp: Date.now(),
      });

      updateGuestList(io, roomCode);
    });

    socket.on('admin:play-pause', (data) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || room.adminSocket !== socket.id) return;

      room.isPlaying = data.isPlaying;
      room.currentTime = data.currentTime;
      room.lastActivity = new Date();

      console.log(`Admin ${data.isPlaying ? 'playing' : 'pausing'} in room ${roomCode} at time ${data.currentTime}`);
      console.log(`Current track: ${room.currentTrack?.name}`);
      console.log(`Broadcasting to ${room.guests.size} guests`);

      socket.to(roomCode).emit('playback:update', {
        isPlaying: data.isPlaying,
        currentTime: data.currentTime,
        track: room.currentTrack,  // Include the track to ensure all guests have it
        timestamp: Date.now(),
      });
    });

    socket.on('admin:sync-time', (data) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room || room.adminSocket !== socket.id) return;

      room.currentTime = data.currentTime;
      room.lastActivity = new Date();

      socket.to(roomCode).emit('time:sync', {
        currentTime: data.currentTime,
        timestamp: Date.now(),
      });
    });

    socket.on('guest:join-room', (data, callback) => {
      const { roomCode, guestName, guestEmoji } = data;
      console.log(`Join room request - Code: ${roomCode}, Name: ${guestName}, Emoji: ${guestEmoji}`);
      
      const room = rooms.get(roomCode);

      if (!room) {
        console.log(`Room ${roomCode} not found`);
        callback({ success: false, error: 'Room not found' });
        return;
      }

      const guestId = generateGuestId();
      const guest = {
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
      socketToRoom.set(socket.id, roomCode);
      socket.join(roomCode);

      const syncData = {
        track: room.currentTrack,
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        playlist: room.playlist,
        timestamp: Date.now(),
      };

      console.log(`Guest ${guestId} (${guestName}) joined room ${roomCode}`);
      console.log(`Sync data - Track: ${room.currentTrack?.name}, Playing: ${room.isPlaying}`);
      console.log(`Total guests in room: ${room.guests.size}`);

      callback({
        success: true,
        guestId,
        syncData,
      });

      // Notify admin about new guest
      io.to(room.adminSocket).emit('guest:joined', {
        guest,
        totalGuests: room.guests.size,
      });

      // Update guest list for everyone (admin and all guests)
      updateGuestList(io, roomCode);
    });

    socket.on('guest:request-sync', (callback) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) {
        callback({ success: false, error: 'Not in a room' });
        return;
      }

      const room = rooms.get(roomCode);
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
    });

    socket.on('guest:ping', (callback) => {
      callback({ timestamp: Date.now() });
    });

    socket.on('disconnect', () => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;

      const room = rooms.get(roomCode);
      if (!room) return;

      if (room.adminSocket === socket.id) {
        io.to(roomCode).emit('room:closed', {
          reason: 'Admin disconnected',
        });
        
        room.guests.forEach(guest => {
          socketToRoom.delete(guest.socketId);
        });
        rooms.delete(roomCode);
        console.log(`Room ${roomCode} closed - admin disconnected`);
      } else {
        let disconnectedGuest = null;
        room.guests.forEach((guest, guestId) => {
          if (guest.socketId === socket.id) {
            guest.isActive = false;
            disconnectedGuest = guest;
          }
        });

        if (disconnectedGuest) {
          io.to(room.adminSocket).emit('guest:left', {
            guestId: disconnectedGuest.id,
            totalGuests: Array.from(room.guests.values()).filter(g => g.isActive).length,
          });

          updateGuestList(io, roomCode);
        }
      }

      socketToRoom.delete(socket.id);
    });
  });

  function updateGuestList(io, roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    const guestList = Array.from(room.guests.values());
    // Emit to admin
    io.to(room.adminSocket).emit('guests:update', { guestList });
    // Also emit to all guests in the room so they can see each other
    io.to(roomCode).emit('guests:update', { guestList });
  }

  // Clean up inactive rooms every 30 minutes
  setInterval(() => {
    const now = new Date();
    const maxInactivity = 2 * 60 * 60 * 1000; // 2 hours

    rooms.forEach((room, roomCode) => {
      if (now.getTime() - room.lastActivity.getTime() > maxInactivity) {
        console.log(`Cleaning up inactive room: ${roomCode}`);
        
        io.to(roomCode).emit('room:closed', {
          reason: 'Room expired due to inactivity',
        });

        room.guests.forEach(guest => {
          socketToRoom.delete(guest.socketId);
        });
        socketToRoom.delete(room.adminSocket);
        rooms.delete(roomCode);
      }
    });
  }, 30 * 60 * 1000);

  server.listen(port, '0.0.0.0', () => {
    console.log('=================================');
    console.log(`✅ Server is running!`);
    console.log(`Port: ${port}`);
    console.log(`Environment: ${dev ? 'development' : 'production'}`);
    if (dev) {
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      let localIP = 'localhost';
      
      // Find the local IP address
      Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(interface => {
          if (interface.family === 'IPv4' && !interface.internal && interface.address.startsWith('192.168')) {
            localIP = interface.address;
          }
        });
      });
      
      console.log(`Local: http://localhost:${port}`);
      console.log(`Network: http://${localIP}:${port}`);
    }
    console.log('Socket.io: Enabled and ready');
    console.log('=================================');
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });
})
.catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});




