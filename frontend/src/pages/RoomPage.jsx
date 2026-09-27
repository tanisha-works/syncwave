import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { VideoPlayer } from '../components/VideoPlayer';
import ParticipantList from '../components/ParticipantList';
import ChatSidebar from '../components/ChatSidebar';
import QueueManager from '../components/QueueManager';

export const RoomPage = () => {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();

  const username = location.state?.username || `User_${Math.floor(Math.random() * 1000)}`;

  const [participants, setParticipants] = useState([]);
  const [userRole, setUserRole] = useState('Participant');
  const [videoId, setVideoId] = useState('dQw4w9WgXcQ');
  const [queue, setQueue] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [reactions, setReactions] = useState([]);
  const [urlInput, setUrlInput] = useState('');

  // Helper function to trigger floating emoji state & auto-cleanup
  const spawnFloatingEmoji = (emoji) => {
    const id = Date.now() + Math.random();
    const left = Math.floor(Math.random() * 70) + 15; // float within 15% to 85% width

    setReactions((prev) => [...prev, { id, emoji, left }]);

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2200);
  };

  useEffect(() => {
    if (!socket) return;

    // 1. Get or create persistent user ID from browser storage
    let userId = localStorage.getItem('syncwave_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('syncwave_user_id', userId);
    }

    // 2. Emit join_room with persistent userId along with username & roomId
    socket.emit('join_room', { roomId, username, userId });

    // Handle room state updates
    const handleRoomDataUpdate = ({ participants: updatedList, videoId: currentVideoId, queue: updatedQueue }) => {
      if (updatedList) {
        setParticipants(updatedList);
        // Find current user using socket.id OR persistent userId
        const current = updatedList.find((p) => p.id === socket.id || p.userId === userId);
        if (current) setUserRole(current.role);
      }
      if (currentVideoId) setVideoId(currentVideoId);
      if (updatedQueue) setQueue(updatedQueue);
    };

    // Handle initial state synchronization from server
    const handleSyncState = (data) => {
      if (data.userRole) setUserRole(data.userRole);
      if (data.chatHistory) setChatHistory(data.chatHistory);
      if (data.videoId) setVideoId(data.videoId);
      if (data.queue) setQueue(data.queue);
    };

    // Handle incoming chat messages centrally
    const handleIncomingMessage = (msg) => {
      setChatHistory((prev) => {
        if (prev.some((m) => m.id && m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const handleChangeVideo = ({ videoId: newVideoId }) => {
      setVideoId(newVideoId);
    };

    // Handle reaction sent from other room participants
    const handleReceiveReaction = ({ emoji }) => {
      spawnFloatingEmoji(emoji);
    };

    const handleKicked = () => {
      alert('You were removed from the watch party.');
      navigate('/');
    };

    socket.on('room_data_update', handleRoomDataUpdate);
    socket.on('sync_state', handleSyncState);
    socket.on('receive_message', handleIncomingMessage);
    socket.on('chat_message', handleIncomingMessage);
    socket.on('change_video', handleChangeVideo);
    socket.on('receive_reaction', handleReceiveReaction);
    socket.on('kicked', handleKicked);

    return () => {
      socket.off('room_data_update', handleRoomDataUpdate);
      socket.off('sync_state', handleSyncState);
      socket.off('receive_message', handleIncomingMessage);
      socket.off('chat_message', handleIncomingMessage);
      socket.off('change_video', handleChangeVideo);
      socket.off('receive_reaction', handleReceiveReaction);
      socket.off('kicked', handleKicked);
    };
  }, [socket, roomId]);

  const sendReaction = (emoji) => {
    // 1. Immediately spawn floating emoji locally on click
    spawnFloatingEmoji(emoji);

    // 2. Broadcast reaction to all other users in the room
    if (socket) {
      socket.emit('send_reaction', { roomId, emoji });
    }
  };

  const handleSendMessage = (text) => {
    if (socket && roomId) {
      socket.emit('send_message', { roomId, message: text });
    }
  };

  const handlePlayVideo = (e) => {
    e?.preventDefault();
    if (!urlInput.trim()) return;
    const match = urlInput.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    const id = match ? match[1] : (urlInput.length === 11 ? urlInput : null);
    
    if (id && socket) {
      socket.emit('change_video', { roomId, videoId: id });
      setUrlInput('');
    } else {
      alert('Invalid YouTube URL');
    }
  };

  const loadPreset = (id) => {
    if (socket) socket.emit('change_video', { roomId, videoId: id });
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Top SyncWave Navbar Bar */}
      <header className="app-header">
        <div className="brand-logo">
          <div className="logo-icon">📺</div>
          <div className="brand-text">
            <h1>SyncWave</h1>
            <span>WATCH PARTY</span>
          </div>
        </div>

        <div className="badge-pill">
          📡 Room: <strong>{roomId}</strong>
          <button
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '6px' }}
            onClick={() => {
              navigator.clipboard.writeText(roomId);
              alert('Room ID copied!');
            }}
          >
            📋
          </button>
        </div>

        <div className="header-meta">
          <button className="btn btn-secondary" onClick={() => {
            navigator.clipboard.writeText(roomId);
            alert(`Room Code copied: ${roomId}`);
          }}>
            🔗 Share Room
          </button> 
          <div className="badge-pill">
            👥 {participants.length}
          </div>
          <div className="badge-pill" style={{ color: '#4ade80' }}>
            🟢 Live
          </div>
          <button className="btn btn-danger" onClick={() => navigate('/')}>
            🚪 Leave
          </button>
        </div>
      </header>

      {/* Main Grid View */}
      <div className="room-container">
        <div className="room-layout">
          <div className="main-view">
            
            {/* Player Container Overlay */}
            <div className="player-container">
              {userRole === 'Host' && (
                <div className="host-status-banner">
                  👑 Room Host (Full Playback Control)
                </div>
              )}
              <div className="sync-status-banner">
                🔄 In Sync
              </div>

              {/* Floating Reactions Overlay */}
              <div className="reaction-overlay">
                {reactions.map((r) => (
                  <div key={r.id} className="floating-emoji" style={{ left: `${r.left}%` }}>
                    {r.emoji}
                  </div>
                ))}
              </div>

              <VideoPlayer socket={socket} roomId={roomId} videoId={videoId} userRole={userRole} />
            </div>

            {/* Change Video Stream Bar */}
            <div className="presets-section">
              <h3>✨ Change Video Stream</h3>
              <form onSubmit={handlePlayVideo} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <input
                  type="text"
                  className="input-box"
                  placeholder="Paste any YouTube URL or Video ID..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  Play for Room
                </button>
              </form>

              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                QUICK TEST PRESETS:
              </label>
              <div className="preset-pills">
                <button className="preset-chip" onClick={() => loadPreset('dQw4w9WgXcQ')}>
                  🎵 Rick Astley - Never Gonna Give You Up
                </button>
                <button className="preset-chip" onClick={() => loadPreset('aqz-KE-bpKQ')}>
                  🎞️ Big Buck Bunny (4K Film)
                </button>
                <button className="preset-chip" onClick={() => loadPreset('FG0fTKAqZ5g')}>
                  🪐 NASA: Earth from Space
                </button>
                <button className="preset-chip" onClick={() => loadPreset('21X5lGlDOfg')}>
                  🚀 SpaceX Starship Orbital Flight
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar Panel */}
          <aside className="sidebar-panel">
            <div className="sidebar-nav">
              <button
                className={`sidebar-tab ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                💬 Room Chat
              </button>
              <button
                className={`sidebar-tab ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => setActiveTab('users')}
              >
                👥 Members ({participants.length})
              </button>
            </div>

            {/* Reactions Toolbar Above Chat */}
            {activeTab === 'chat' && (
              <div className="reaction-bar-chat">
                <label>Reactions:</label>
                {['❤️', '🔥', '👏', '😂', '🎉', '🍿', '🚀'].map((emoji) => (
                  <button key={emoji} className="emoji-btn" onClick={() => sendReaction(emoji)}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {activeTab === 'chat' ? (
                <ChatSidebar
                  socket={socket}
                  roomId={roomId}
                  messages={chatHistory}
                  onSendMessage={handleSendMessage}
                />
              ) : (
                <ParticipantList
                  participants={participants}
                  socket={socket}
                  roomId={roomId}
                  currentUserRole={userRole}
                  currentUserId={socket?.id}
                  userRole={userRole}
                  onAssignRole={(targetUserId, newRole) => socket?.emit('assign_role', { roomId, targetUserId, newRole, role: newRole })}
                  onRemoveUser={(targetUserId) => socket?.emit('kick_user', { roomId, targetUserId })}
                  onTransferHost={(targetUserId) => socket?.emit('transfer_host', { roomId, targetUserId })}
                />
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};