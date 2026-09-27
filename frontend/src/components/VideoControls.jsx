import React, { useState } from 'react';

export const VideoControls = ({ onChangeVideo, userRole }) => {
  const [urlInput, setUrlInput] = useState('');
  const canControl = userRole === 'Host' || userRole === 'Moderator';

  const extractVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : (url.length === 11 ? url : null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canControl) return;

    const id = extractVideoId(urlInput.trim());
    if (id) {
      onChangeVideo(id);
      setUrlInput('');
    } else {
      alert('Please enter a valid YouTube link or 11-character Video ID.');
    }
  };

  return (
    <div className="presets-section">
      <h3>🔍 Change Video for Everyone</h3>

      {canControl ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <input
            type="text"
            className="input-box"
            placeholder="Paste YouTube Video URL or Video ID..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            Play Video 🚀
          </button>
        </form>
      ) : (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
          🔒 Only Hosts and Moderators can change the playing video.
        </p>
      )}
    </div>
  );
};

export default VideoControls;