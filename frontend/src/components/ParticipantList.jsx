import React from 'react';

export default function ParticipantList({ participants = [], socket, roomId, currentUserRole }) {
  const currentUserId = socket?.id;

  const handleAssignRole = (targetUserId, role) => {
    if (!socket || !roomId) return;
    socket.emit('assign_role', { roomId, targetUserId, newRole: role, role });
  };

  const handleKickUser = (targetUserId) => {
    if (!socket || !roomId) return;
    socket.emit('kick_user', { roomId, targetUserId });
    socket.emit('remove_participant', { roomId, targetUserId });
  };

  const handleTransferHost = (targetUserId) => {
    if (!socket || !roomId) return;
    socket.emit('transfer_host', { roomId, targetUserId });
  };

  return (
    <div className="participant-list">
      {participants.map((p) => {
        const isSelf = p.id === currentUserId;
        const initial = (p.username || 'U').charAt(0).toUpperCase();
        const role = p.role || 'Participant';

        return (
          <div key={p.id} className="participant-card">
            <div className="user-meta">
              <div className="user-avatar">{initial}</div>
              <div className="user-details">
                <span className="user-name">
                  {p.username} {isSelf && <small style={{ color: '#818cf8' }}>(You)</small>}
                </span>
                <span className={`role-badge role-${role.toLowerCase()}`}>
                  {role === 'Host' ? '👑 Host' : role === 'Moderator' ? '🛡️ Mod' : '👤 Participant'}
                </span>
              </div>
            </div>

            {/* Moderation Actions (Only visible to Host for other participants) */}
            {currentUserRole === 'Host' && !isSelf && (
              <div className="action-menu">
                {role !== 'Moderator' && (
                  <button
                    className="btn-action btn-mod"
                    title="Promote to Moderator"
                    onClick={() => handleAssignRole(p.id, 'Moderator')}
                  >
                    Mod
                  </button>
                )}
                {role === 'Moderator' && (
                  <button
                    className="btn-action btn-demote"
                    title="Demote to Participant"
                    onClick={() => handleAssignRole(p.id, 'Participant')}
                  >
                    Unmod
                  </button>
                )}
                <button
                  className="btn-action btn-transfer"
                  title="Transfer Host Powers"
                  onClick={() => handleTransferHost(p.id)}
                >
                  Make Host
                </button>
                <button
                  className="btn-action btn-kick"
                  title="Kick User"
                  onClick={() => handleKickUser(p.id)}
                >
                  Kick
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}