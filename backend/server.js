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

// Store disconnect timers using activeUserId so we can cancel refreshes cleanly
const disconnectTimers = new Map();

io.on('connection', (socket) => {
  console.log(`⚡ Connected: ${socket.id}`);

  // JOIN ROOM
  socket.on('join_room', ({ roomId, username, userId }) => {
    let room = roomManager.getRoom(roomId);
    
    // Use permanent userId or fallback to socket.id
    const activeUserId = userId || socket.id;
    socket.userId = activeUserId;
    socket.roomId = roomId;

    // If refreshing or reconnecting, CANCEL the disconnect timer immediately
    if (disconnectTimers.has(activeUserId)) {
      clearTimeout(disconnectTimers.get(activeUserId));
      disconnectTimers.delete(activeUserId);
      console.log(`🔄 Reconnection detected for user ${username || activeUserId}. Cancelled leave timer.`);
    }

    let isReconnecting = false;
    
    if (!room) {
      // Room doesn't exist, create it
      room = roomManager.createRoom(roomId, socket.id, username);
      room.chatHistory = room.chatHistory || [];
      room.queue = room.queue || [];
      
      const host = room.getParticipant(socket.id);
      if (host) host.userId = activeUserId;
    } else {
      // Room exists, check if user is already in it (Reconnection/Refresh)
      const participantsArray = Array.from(room.participants.values());
      const existing = participantsArray.find(p => p.userId === activeUserId);
      
      if (existing) {
        isReconnecting = true;
        // Move existing participant data to new socket ID
        room.participants.delete(existing.id);
        existing.id = socket.id;
        if (username) existing.username = username;
        room.participants.set(socket.id, existing);
      } else {
        // Brand new user joining
        room.addParticipant(socket.id, username, 'Participant');
        const newPart = room.getParticipant(socket.id);
        if (newPart) newPart.userId = activeUserId;
      }
    }

    socket.join(roomId);

    const participant = room.getParticipant(socket.id);
    const userRole = participant ? participant.role : 'Participant';

    // Send "joined room" system message ONLY if it's a genuinely new join
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

    // Always broadcast current participant list to everyone in the room
    io.to(roomId).emit('room_data_update', {
      participants: room.getFormattedParticipants(),
      videoId: room.videoId,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      queue: room.queue || []
    });

    // Sync user state
    socket.emit('sync_state', {
      videoId: room.videoId,
      currentTime: room.currentTime,
      isPlaying: room.isPlaying,
      userRole,
      chatHistory: room.chatHistory,
      queue: room.queue || []
    });
  });

  // EXPLICIT LEAVE ROOM (User clicks "Leave Room" button)
  socket.on('leave_room', ({ roomId }) => {
    const targetRoomId = roomId || socket.roomId;
    if (!targetRoomId) return;

    const room = roomManager.getRoom(targetRoomId);
    if (!room) return;

    const participant = room.getParticipant(socket.id);
    const username = participant ? participant.username : 'A user';
    const activeUserId = socket.userId || socket.id;

    // Clear any pending disconnect timer
    if (disconnectTimers.has(activeUserId)) {
      clearTimeout(disconnectTimers.get(activeUserId));
      disconnectTimers.delete(activeUserId);
    }

    // Immediately remove from room
    room.removeParticipant(socket.id);
    socket.leave(targetRoomId);

    const sysMessage = {
      id: 'sys_' + Date.now(),
      username: 'System',
      text: `${username} left the room.`,
      isSystem: true
    };
    if (room.chatHistory) room.chatHistory.push(sysMessage);
    io.to(targetRoomId).emit('receive_message', sysMessage);

    io.to(targetRoomId).emit('room_data_update', {
      participants: room.getFormattedParticipants(),
      videoId: room.videoId,
      queue: room.queue || []
    });

    if (room.participants.size === 0) {
      roomManager.deleteRoom(targetRoomId);
    }
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

  // PLAY / PAUSE / SEEK
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

  // ASSIGN ROLE
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

  // REMOVE / KICK PARTICIPANT
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

  // DISCONNECT (With 4-Second Grace Period for Refreshes)
  socket.on('disconnecting', () => {
    socket.rooms.forEach((roomId) => {
      if (roomId === socket.id) return;
      const room = roomManager.getRoom(roomId);
      
      if (room) {
        const participant = room.getParticipant(socket.id);
        const username = participant ? participant.username : 'A user';
        const activeUserId = socket.userId || socket.id;

        // Set a timer for 4 seconds to allow page refreshes to reconnect cleanly
        const timer = setTimeout(() => {
          // Re-fetch the current room and check if this persistent user exists under ANY socket ID
          const currentRoom = roomManager.getRoom(roomId);
          if (currentRoom) {
            const partsArray = Array.from(currentRoom.participants.values());
            const stillPresent = partsArray.some(p => p.userId === activeUserId);

            // ONLY emit leave message and remove if they didn't reconnect
            if (!stillPresent) {
              currentRoom.removeParticipant(socket.id);
              
              const sysMessage = {
                id: 'sys_' + Date.now(),
                username: 'System',
                text: `${username} left the room.`,
                isSystem: true
              };
              
              if (currentRoom.chatHistory) currentRoom.chatHistory.push(sysMessage);
              io.to(roomId).emit('receive_message', sysMessage);
              
              io.to(roomId).emit('room_data_update', {
                participants: currentRoom.getFormattedParticipants(),
                videoId: currentRoom.videoId,
                queue: currentRoom.queue || []
              });

              if (currentRoom.participants.size === 0) {
                roomManager.deleteRoom(roomId);
              }
            }
          }

          disconnectTimers.delete(activeUserId);
        }, 4000);

        disconnectTimers.set(activeUserId, timer);
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});