// Represents an individual user connected to a room
class Participant {
  constructor(id, username, role) {
    this.id = id;          // Socket ID
    this.username = username;
    this.role = role;      // 'Host', 'Moderator', 'Participant'
  }
}

// Represents a single Watch Party Room
class Room {
  constructor(roomId, hostId, hostUsername, videoId = 'dQw4w9WgXcQ') {
    this.roomId = roomId;
    this.videoId = videoId;
    this.currentTime = 0;
    this.isPlaying = false;
    this.participants = new Map(); // Stores socketId -> Participant instance

    // Creator automatically becomes Host
    this.addParticipant(hostId, hostUsername, 'Host');
  }

  addParticipant(socketId, username, role = 'Participant') {
    const participant = new Participant(socketId, username, role);
    this.participants.set(socketId, participant);
    return participant;
  }

  removeParticipant(socketId) {
    this.participants.delete(socketId);
  }

  getParticipant(socketId) {
    return this.participants.get(socketId);
  }

  setRole(socketId, newRole) {
    const participant = this.participants.get(socketId);
    if (participant) {
      participant.role = newRole;
    }
  }

  getFormattedParticipants() {
    return Array.from(this.participants.values());
  }

  updateState(isPlaying, currentTime, videoId) {
    if (isPlaying !== undefined) this.isPlaying = isPlaying;
    if (currentTime !== undefined) this.currentTime = currentTime;
    if (videoId !== undefined) this.videoId = videoId;
  }
}

// Manages all active rooms in memory
class RoomManager {
  constructor() {
    this.rooms = new Map(); // Stores roomId -> Room instance
  }

  createRoom(roomId, hostId, hostUsername) {
    const room = new Room(roomId, hostId, hostUsername);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  deleteRoom(roomId) {
    this.rooms.delete(roomId);
  }
}

// Export a single instance to share across the backend
module.exports = new RoomManager();