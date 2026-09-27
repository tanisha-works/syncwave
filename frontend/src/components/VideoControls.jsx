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
    <div className="video-controls-bar">
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
        🔍 Change Video for Everyone
      </div>

      {canControl ? (
        <form onSubmit={handleSubmit} className="control-row">
          <input
            type="text"
            className="input-field"
            placeholder="Paste YouTube Video URL or Video ID..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Play Video 🚀
          </button>
        </form>
      ) : (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          🔒 Only Hosts and Moderators can change the playing video.
        </p>
      )}
    </div>
  );
};