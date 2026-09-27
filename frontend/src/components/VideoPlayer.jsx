import React, { useRef, useEffect } from 'react';
import YouTube from 'react-youtube';

export const VideoPlayer = ({ socket, roomId, videoId, userRole }) => {
  const playerRef = useRef(null);
  const isProcessingEvent = useRef(false);

  const canControl = userRole === 'Host' || userRole === 'Moderator';
  const isHost = userRole === 'Host';

  useEffect(() => {
    if (!socket) return;

    // --- SOCKET LISTENERS ---

    socket.on('play', ({ time }) => {
      if (!playerRef.current) return;
      isProcessingEvent.current = true;

      if (time !== undefined && Math.abs(playerRef.current.getCurrentTime() - time) > 0.5) {
        playerRef.current.seekTo(time, true);
      }
      playerRef.current.playVideo();

      setTimeout(() => {
        isProcessingEvent.current = false;
      }, 500);
    });

    socket.on('pause', ({ time }) => {
      if (!playerRef.current) return;
      isProcessingEvent.current = true;

      if (time !== undefined) {
        playerRef.current.seekTo(time, true);
      }
      playerRef.current.pauseVideo();

      setTimeout(() => {
        isProcessingEvent.current = false;
      }, 500);
    });

    socket.on('seek', ({ time }) => {
      if (!playerRef.current) return;
      isProcessingEvent.current = true;

      playerRef.current.seekTo(time, true);

      setTimeout(() => {
        isProcessingEvent.current = false;
      }, 500);
    });

    socket.on('sync_state', ({ currentTime, isPlaying }) => {
      if (!playerRef.current) return;
      isProcessingEvent.current = true;

      if (currentTime !== undefined) {
        playerRef.current.seekTo(currentTime, true);
      }
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }

      setTimeout(() => {
        isProcessingEvent.current = false;
      }, 500);
    });

    return () => {
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
      socket.off('sync_state');
    };
  }, [socket]);

  // --- PLAYER STATE CHANGE HANDLER ---
  const handleStateChange = (event) => {
    // 1. Ignore if non-controller (regular participant)
    if (!canControl) return;

    // 2. Ignore if state change was caused by an incoming socket event
    if (isProcessingEvent.current) return;

    const state = event.data;
    const currentTime = playerRef.current ? playerRef.current.getCurrentTime() : 0;

    // YouTube States: 1 = PLAYING, 2 = PAUSED
    if (state === 1) {
      socket.emit('play', { roomId, time: currentTime });
    } else if (state === 2) {
      socket.emit('pause', { roomId, time: currentTime });
    }
  };

  const opts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
      rel: 0,
      modestbranding: 1
    }
  };

  return (
    <div className="player-container">
      {/* Top Floating Overlay Badges */}
      {isHost && (
        <div className="host-status-banner">
          👑 Room Host (Full Playback Control)
        </div>
      )}

      <div className="sync-status-banner">
        🔄 In Sync
      </div>

      {/* YouTube Video Player */}
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={(e) => {
          playerRef.current = e.target;
        }}
        onStateChange={handleStateChange}
      />
    </div>
  );
};

export default VideoPlayer;