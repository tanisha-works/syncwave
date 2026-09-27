import React, { useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import LiveReactions from './LiveReactions';

export const VideoPlayer = ({ socket, roomId, videoId, userRole }) => {
  const playerRef = useRef(null);
  const isRemoteAction = useRef(false);

  const canControl = userRole === 'Host' || userRole === 'Moderator';

  useEffect(() => {
    if (!socket) return;

    socket.on('play', ({ time }) => {
      isRemoteAction.current = true;
      if (playerRef.current) {
        if (time !== undefined && Math.abs(playerRef.current.getCurrentTime() - time) > 1.5) {
          playerRef.current.seekTo(time, true);
        }
        playerRef.current.playVideo();
      }
    });

    socket.on('pause', ({ time }) => {
      isRemoteAction.current = true;
      if (playerRef.current) {
        if (time !== undefined) {
          playerRef.current.seekTo(time, true);
        }
        playerRef.current.pauseVideo();
      }
    });

    socket.on('seek', ({ time }) => {
      isRemoteAction.current = true;
      if (playerRef.current) {
        playerRef.current.seekTo(time, true);
      }
    });

    socket.on('sync_state', ({ currentTime, isPlaying }) => {
      isRemoteAction.current = true;
      if (playerRef.current) {
        if (currentTime) playerRef.current.seekTo(currentTime, true);
        if (isPlaying) playerRef.current.playVideo();
        else playerRef.current.pauseVideo();
      }
    });

    return () => {
      socket.off('play');
      socket.off('pause');
      socket.off('seek');
      socket.off('sync_state');
    };
  }, [socket]);

  const handleStateChange = (event) => {
    if (!canControl) return;

    if (isRemoteAction.current) {
      isRemoteAction.current = false;
      return;
    }

    const state = event.data;
    const currentTime = playerRef.current ? playerRef.current.getCurrentTime() : 0;

    if (state === 1) { // PLAYING
      socket.emit('play', { roomId, time: currentTime });
    } else if (state === 2) { // PAUSED
      socket.emit('pause', { roomId, time: currentTime });
    }
  };

  const opts = {
    height: '450',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
      rel: 0,
      modestbranding: 1
    }
  };

  return (
    <div className="player-wrapper" style={{ position: 'relative' }}>
      <YouTube
        videoId={videoId}
        opts={opts}
        onReady={(e) => {
          playerRef.current = e.target;
        }}
        onStateChange={handleStateChange}
      />
      {/* Floating Reactions and Quick Emoji Bar */}
      <LiveReactions socket={socket} roomId={roomId} />
    </div>
  );
};

export default VideoPlayer;