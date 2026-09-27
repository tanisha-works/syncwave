const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const roomManager = require('./utils/RoomManager');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST']
}));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const hasPermission = (room, socketId, allowedRoles) => {
  const participant = room.getParticipant(socketId);
  return participant && allowedRoles.includes(participant.role);
};

// Store disconnect timers so we can cancel them if a user reconnects quickly
const disconnectTimers = new Map();

io.on('connection', (socket) => {
  console.log(`⚡ Connected: ${socket.id}`);

  // JOIN ROOM
  socket.on('join_room', ({ roomId, username, userId }) => {
    let room = roomManager.getRoom(roomId);
    
    // Use the permanent userId from localStorage, or fallback to socket.id
    const activeUserId = userId || socket.id;
    socket.userId = activeUserId; // Attach to socket for disconnect tracking

    // If they were refreshing, cancel their disconnect deletion timer
    if (disconnectTimers.has(activeUserId)) {
      clearTimeout(disconnectTimers.get(activeUserId));
      disconnectTimers.delete(activeUserId);
    }

    let isReconnecting = false;
    
    if (!room) {
      // Room doesn't exist, create it
      room = roomManager.createRoom(roomId, socket.id, username);
      room.chatHistory = room.chatHistory || [];
      room.queue = room.queue || [];
      
      const host = room.getParticipant(socket.id);
      if (host) host.userId = activeUserId; // Store persistent ID
    } else {
      // Room exists, check if user is already in it (Reconnection/Refresh)
      const participantsArray = Array.from(room.participants.values());
      const existing = participantsArray.find(p => p.userId === activeUserId || p.id === socket.id);
      
      if (existing) {
        isReconnecting = true;
        // Move their existing data to the new socket ID
        room.participants.delete(existing.id); // Remove old socket reference
        existing.id = socket.id;               // Update to new socket id
        if (username) existing.username = username; // Update username if it changed
        room.participants.set(socket.id, existing); // Save with new socket ID key
      } else {
        // Brand new user joining
        room.addParticipant(socket.id, username, 'Participant');
        const newPart = room.getParticipant(socket.id);
        if (newPart) newPart.userId = activeUserId; // Store persistent ID
      }
    }

    socket.join(roomId);

    const participant = room.getParticipant(socket.id);
    const userRole = participant ? participant.role : 'Participant';

    // Only broadcast "joined the room" if it's a new connection, not a refresh
    if (!isReconnecting) {
      const sysMessage = {
        id: 'sys_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        username: 'System',
        text: `${username} joined the room.`,
        isSystem: true
      };
      room.chatHistory = room.chatHistory || [];
      room.chatHistory.push(sysMessage);
      io.to(roomId).emit('receive_message', sysMessage);
    }

    // Always update everyone with the current participant list
    io.to(roomId).emit('room_data_update', {
      participants: room.getFormattedParticipants(),
      videoId: room.videoId,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      queue: room.queue || []
    });

    // Sync the current user who just joined/reconnected
    socket.emit('sync_state', {
      videoId: room.videoId,
      currentTime: room.currentTime,
      isPlaying: room.isPlaying,
      userRole,
      chatHistory: room.chatHistory,
      queue: room.queue || []
    });
  });

  // SEND MESSAGE
  socket.on('send_message', ({ roomId, message }) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const participant = room.getParticipant(socket.id);
    if (!participant) return;

    const chatData = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      username: participant.username,
      text: message,
      isSystem: false
    };

    room.chatHistory.push(chatData);
    if (room.chatHistory.length > 100) room.chatHistory.shift();

    io.to(roomId).emit('receive_message', chatData);
  });

  // SEND REACTION
  socket.on('send_reaction', ({ roomId, emoji }) => {
    socket.to(roomId).emit('receive_reaction', { emoji });
  });

  // PLAY / PAUSE / SEEK PERMISSIONS (Host & Moderator)
  socket.on('play', ({ roomId, time }) => {
    const room = roomManager.getRoom(roomId);
    if (room && hasPermission(room, socket.id, ['Host', 'Moderator'])) {
      room.updateState(true, time);
      io.to(roomId).emit('play', { time });
    }
  });

  socket.on('pause', ({ roomId, time }) => {
    const room = roomManager.getRoom(roomId);
    if (room && hasPermission(room, socket.id, ['Host', 'Moderator'])) {
      room.updateState(false, time);
      io.to(roomId).emit('pause', { time });
    }
  });

  socket.on('seek', ({ roomId, time }) => {
    const room = roomManager.getRoom(roomId);
    if (room && hasPermission(room, socket.id, ['Host', 'Moderator'])) {
      room.updateState(undefined, time);
      io.to(roomId).emit('seek', { time });
    }
  });

  // CHANGE VIDEO
  socket.on('change_video', ({ roomId, videoId, title }) => {
    const room = roomManager.getRoom(roomId);
    if (room && hasPermission(room, socket.id, ['Host', 'Moderator'])) {
      room.updateState(false, 0, videoId);
      io.to(roomId).emit('change_video', { videoId, title });
    }
  });

  // ASSIGN ROLE (MOD / DEMOTE)
  socket.on('assign_role', ({ roomId, targetUserId, newRole, role }) => {
    const targetRole = newRole || role;
    const room = roomManager.getRoom(roomId);
    
    if (room && hasPermission(room, socket.id, ['Host'])) {
      room.setRole(targetUserId, targetRole);

      const targetParticipant = room.getParticipant(targetUserId);
      const targetName = targetParticipant ? targetParticipant.username : 'User';

      io.to(roomId).emit('room_data_update', {
        participants: room.getFormattedParticipants(),
        videoId: room.videoId,
        queue: room.queue || []
      });

      // Send direct socket event to the target user so their userRole updates instantly in React state
      const targetSocket = io.sockets.sockets.get(targetUserId);
      if (targetSocket) {
        targetSocket.emit('sync_state', { userRole: targetRole });
      }

      io.to(roomId).emit('receive_message', {
        id: 'sys_' + Date.now(),
        username: 'System',
        text: `${targetName} is now a ${targetRole}.`,
        isSystem: true
      });
    }
  });

  // TRANSFER HOST
  socket.on('transfer_host', ({ roomId, targetUserId }) => {
    const room = roomManager.getRoom(roomId);
    if (room && hasPermission(room, socket.id, ['Host'])) {
      room.setRole(socket.id, 'Participant');
      room.setRole(targetUserId, 'Host');

      const targetParticipant = room.getParticipant(targetUserId);
      const targetName = targetParticipant ? targetParticipant.username : 'User';

      io.to(roomId).emit('room_data_update', {
        participants: room.getFormattedParticipants(),
        videoId: room.videoId,
        queue: room.queue || []
      });

      // Notify former host and new host to update their local React state role
      socket.emit('sync_state', { userRole: 'Participant' });
      const targetSocket = io.sockets.sockets.get(targetUserId);
      if (targetSocket) {
        targetSocket.emit('sync_state', { userRole: 'Host' });
      }

      io.to(roomId).emit('receive_message', {
        id: 'sys_' + Date.now(),
        username: 'System',
        text: `Host role transferred to ${targetName}.`,
        isSystem: true
      });
    }
  });

  // KICK / REMOVE PARTICIPANT
  const handleRemoveUser = ({ roomId, targetUserId }) => {
    const room = roomManager.getRoom(roomId);
    if (room && hasPermission(room, socket.id, ['Host'])) {
      const targetParticipant = room.getParticipant(targetUserId);
      const targetName = targetParticipant ? targetParticipant.username : 'User';

      room.removeParticipant(targetUserId);
      
      const targetSocket = io.sockets.sockets.get(targetUserId);
      if (targetSocket) {
        targetSocket.leave(roomId);
        targetSocket.emit('kicked');
      }

      io.to(roomId).emit('room_data_update', {
        participants: room.getFormattedParticipants(),
        videoId: room.videoId,
        queue: room.queue || []
      });

      io.to(roomId).emit('receive_message', {
        id: 'sys_' + Date.now(),
        username: 'System',
        text: `${targetName} was removed from the party.`,
        isSystem: true
      });
    }
  };

  socket.on('remove_participant', handleRemoveUser);
  socket.on('kick_user', handleRemoveUser);

  // DISCONNECT (With 3-Second Grace Period for Refreshes)
  socket.on('disconnecting', () => {
    socket.rooms.forEach((roomId) => {
      if (roomId === socket.id) return; // Skip default socket room
      const room = roomManager.getRoom(roomId);
      
      if (room) {
        const participant = room.getParticipant(socket.id);
        const username = participant ? participant.username : 'A user';
        const userId = socket.userId || socket.id;

        // Set a timer. If they don't reconnect in 3 seconds, remove them.
        const timer = setTimeout(() => {
          room.removeParticipant(socket.id);
          
          const sysMessage = {
            id: 'sys_' + Date.now(),
            username: 'System',
            text: `${username} left the room.`,
            isSystem: true
          };
          
          if (room.chatHistory) room.chatHistory.push(sysMessage);
          io.to(roomId).emit('receive_message', sysMessage);
          
          io.to(roomId).emit('room_data_update', {
            participants: room.getFormattedParticipants(),
            videoId: room.videoId,
            queue: room.queue || []
          });

          if (room.participants.size === 0) {
            roomManager.deleteRoom(roomId);
          }

          disconnectTimers.delete(userId);
        }, 3000); // 3-second grace period

        disconnectTimers.set(userId, timer);
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});