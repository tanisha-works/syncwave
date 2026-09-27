import React, { useEffect, useState } from 'react';

const REACTION_EMOJIS = ['❤️', '🔥', '👏', '😂', '😮', '🍿'];

export default function LiveReactions({ socket, roomId }) {
  const [activeReactions, setActiveReactions] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleNewReaction = (reaction) => {
      // Calculate random horizontal offset across the video width (10% to 85%)
      const randomLeft = Math.floor(Math.random() * 75) + 10;
      const reactionItem = {
        ...reaction,
        left: randomLeft
      };

      setActiveReactions((prev) => [...prev, reactionItem]);

      // Remove the emoji after animation finishes (2.5s)
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((item) => item.id !== reactionItem.id));
      }, 2500);
    };

    socket.on('new_reaction', handleNewReaction);

    return () => {
      socket.off('new_reaction', handleNewReaction);
    };
  }, [socket]);

  const sendReaction = (emoji) => {
    if (socket && roomId) {
      socket.emit('send_reaction', { roomId, emoji });
    }
  };

  return (
    <>
      {/* Floating Reaction Layer over Video Player */}
      <div className="reaction-overlay">
        {activeReactions.map((item) => (
          <div
            key={item.id}
            className="floating-emoji"
            style={{ left: `${item.left}%` }}
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Interactive Quick Reaction Bar */}
      <div className="reaction-bar">
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          Reactions:
        </span>
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            className="reaction-btn"
            onClick={() => sendReaction(emoji)}
            title={`Send ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}