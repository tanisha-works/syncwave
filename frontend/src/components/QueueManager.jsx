import React, { useState } from 'react';

export default function QueueManager({ socket, roomId, queue = [], userRole }) {
  const [videoUrl, setVideoUrl] = useState('');
  const canManage = userRole === 'Host' || userRole === 'Moderator';

  // Helper to extract YouTube Video ID
  const extractVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : (url.length === 11 ? url : null);
  };

  const handleAddToQueue = (e) => {
    e.preventDefault();
    const id = extractVideoId(videoUrl.trim());
    if (!id || !socket) {
      alert('Please enter a valid YouTube URL or 11-character Video ID');
      return;
    }

    socket.emit('add_to_queue', {
      roomId,
      video: {
        id,
        title: `YouTube Video (${id})`,
        addedBy: 'User'
      }
    });

    setVideoUrl('');
  };

  const handlePlayNow = (videoId) => {
    if (!socket || !canManage) return;
    socket.emit('change_video', {
      roomId,
      videoId,
      title: `Playing from Queue (${videoId})`
    });
  };

  const handleRemove = (index) => {
    if (!socket || !canManage) return;
    socket.emit('remove_from_queue', { roomId, index });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {canManage ? (
        <form onSubmit={handleAddToQueue} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="url-input"
            placeholder="Paste YouTube link to queue..."
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            + Queue
          </button>
        </form>
      ) : (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Only Hosts and Moderators can manage the room queue.
        </p>
      )}

      <div className="queue-list" style={{ flex: 1, minHeight: 0 }}>
        {queue.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px', fontSize: '0.85rem' }}>
            No videos in queue yet.
          </div>
        ) : (
          queue.map((item, idx) => (
            <div key={item.id + idx} className="queue-item">
              <img
                src={`https://img.youtube.com/vi/${item.id}/hqdefault.jpg`}
                alt="Thumbnail"
                className="queue-thumb"
              />
              <div className="queue-info">
                <div className="queue-title">{item.title}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ID: {item.id}</div>
              </div>

              {canManage && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    className="btn btn-secondary btn-xs"
                    onClick={() => handlePlayNow(item.id)}
                    title="Play Now"
                  >
                    ▶
                  </button>
                  <button
                    className="btn btn-secondary btn-xs"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => handleRemove(idx)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}