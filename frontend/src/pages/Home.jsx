import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Home = () => {
  const [mode, setMode] = useState('create'); // 'create' | 'join'
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();

  const handleStartParty = (e) => {
  e.preventDefault();
  if (!username.trim()) return alert('Please enter your display name');

  if (mode === 'create') {
    const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/room/${generatedCode}`, { state: { username } });
  } else {
    if (!roomCode.trim()) return alert('Please enter a room code');

    // Strip full URL if pasted into the input field
    let cleanCode = roomCode.trim();
    if (cleanCode.includes('/room/')) {
      cleanCode = cleanCode.split('/room/').pop();
    }
    cleanCode = cleanCode.replace(/\/$/, '').split('?')[0];

    navigate(`/room/${cleanCode}`, { state: { username } });
  }
};
  const handleInstantDemo = () => {
    const demoCode = 'DEMO' + Math.floor(1000 + Math.random() * 9000);
    navigate(`/room/${demoCode}`, { state: { username: username || 'Demo User' } });
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Navbar Header */}
      <header className="app-header">
        <div className="brand-logo">
          <div className="logo-icon">📺</div>
          <div className="brand-text">
            <h1>SyncWave</h1>
            <span>WATCH PARTY</span>
          </div>
        </div>
        <div className="header-meta">
          <div className="badge-pill">
            <span className="live-dot"></span> Live
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-tag">
          ⚡ Real-Time WebSocket Synchronization System
        </div>
        <h1 className="hero-title">
          Watch YouTube Together <br />
          <span>In Perfect Sync.</span>
        </h1>
        <p className="hero-desc">
          Experience ultra-smooth, zero-latency watch parties with synchronized play, pause,
          scrub seek, role-based controls, live chat, and floating emoji reactions.
        </p>

        {/* Card Form */}
        <div className="party-card">
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              Your Display Name
            </label>
            <input
              type="text"
              className="input-box"
              placeholder="Enter name..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="toggle-group">
            <button
              className={`toggle-btn ${mode === 'create' ? 'active' : ''}`}
              onClick={() => setMode('create')}
            >
              📡 Create New Room
            </button>
            <button
              className={`toggle-btn ${mode === 'join' ? 'active' : ''}`}
              onClick={() => setMode('join')}
            >
              ▷ Join Existing Room
            </button>
          </div>

          <form onSubmit={handleStartParty}>
            {mode === 'join' && (
              <div style={{ marginBottom: '18px' }}>
                <input
                  type="text"
                  className="input-box"
                  placeholder="Enter Room Code (e.g. 5xMT7VR0)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                />
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              {mode === 'create' ? 'Create Watch Party →' : 'Join Watch Party →'}
            </button>
          </form>

          <div className="info-note">
            👑 You will become the <strong>Room Host</strong> with full permission to manage playback, assign moderators, and load videos.
          </div>

          <div className="divider-or">
            <span>OR</span>
          </div>

          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={handleInstantDemo}>
            ⚡ Launch Instant Demo Party Room
          </button>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">📡</div>
          <h3>Sub-Second Sync</h3>
          <p>Automated drift correction and synchronized timestamps ensure everyone sees the exact same frame.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🛡️</div>
          <h3>Role-Based Access</h3>
          <p>Host, Moderator, and Viewer roles prevent unauthorized pauses. Participants can request control anytime.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">💬</div>
          <h3>Chat & Emoji Bursts</h3>
          <p>Real-time messaging, system activity updates, and floating animated emoji reactions over the video stream.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎞️</div>
          <h3>Universal YouTube Support</h3>
          <p>Load any YouTube video, livestream, or shorts instantly via link or pick from built-in quick presets.</p>
        </div>
      </div>
    </div>
  );
};