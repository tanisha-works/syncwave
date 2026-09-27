import React, { useState, useEffect, useRef } from 'react';

export default function ChatSidebar({ socket, roomId, messages = [], onSendMessage }) {
  const [text, setText] = useState('');
  const chatEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    // Send via parent handler to keep socket logic centralized
    onSendMessage(text.trim());
    setText('');
  };

  return (
    <div className="chat-container">
      {/* Scrollable Messages Container */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat-msg">No messages yet. Say hello! 👋</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id || Math.random()}
              className={`chat-bubble ${msg.isSystem ? 'system-msg' : ''}`}
            >
              {msg.isSystem ? (
                <span>📢 {msg.text}</span>
              ) : (
                <div>
                  <strong className="chat-author">{msg.username || msg.sender}: </strong>
                  <span>{msg.text}</span>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Fixed Input Bar At Bottom */}
      <form onSubmit={handleSend} className="chat-input-form-bottom">
        <input
          type="text"
          className="chat-input"
          placeholder="Send a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="chat-send-btn">
          Send
        </button>
      </form>
    </div>
  );
}