import { formatTime } from '../utils/formatTime';
import { useAuth } from '../context/AuthContext';

export default function RoomList({
  rooms,
  currentRoom,
  onSelectRoom,
  getRoomName,
  getRoomAvatar,
  isRoomOnline,
  unreadCounts,
  typingUsers = {},
  onContextMenu,
}) {
  const { user } = useAuth();
  if (rooms.length === 0) {
    return (
      <div className="empty-rooms">
        <p>No conversations found</p>
      </div>
    );
  }

  return (
    <div className="room-list">
      {rooms.map((room) => {
        const isActive = currentRoom?._id === room._id;
        const unreadCount = unreadCounts[room._id] || 0;
        const typingUser = typingUsers[room._id];
        
        return (
          <div
            key={room._id}
            className={`room-item ${isActive ? 'active' : ''} ${
              unreadCount > 0 ? 'unread' : ''
            }`}
            onClick={() => onSelectRoom(room)}
            onContextMenu={(e) => onContextMenu(e, room)}
          >
            <div className="room-avatar-wrapper">
              <img
                src={getRoomAvatar(room)}
                alt={getRoomName(room)}
                className="room-avatar"
              />
              {isRoomOnline(room) && <span className="online-dot" />}
            </div>

            <div className="room-info">
              <div className="room-info-top">
                <span className="room-name">{getRoomName(room)}</span>
                <span className="room-time">
                  {room.lastMessage
                    ? formatTime(room.lastMessage.createdAt)
                    : ''}
                </span>
              </div>

              <div className="room-info-bottom">
                <div className="room-last-msg-row">
                <div className="room-message-text">
                    <span className="room-last-message">
                      {user?.settings?.lockedChats?.includes(room._id) ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#818CF8' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                          Locked
                        </span>
                      ) : typingUser ? (
                        <span className="room-typing-text">
                          {typingUser.username} is typing...
                        </span>
                      ) : (
                        <>
                          {room.lastMessage?.sender?._id === user?._id && 'You: '}
                          {room.lastMessage?.type === 'image' && '📷 Image'}
                          {room.lastMessage?.type === 'video' && '🎥 Video'}
                          {room.lastMessage?.type === 'document' && '📄 Document'}
                          {room.lastMessage?.type === 'voice' && '🎤 Voice message'}
                          {room.lastMessage?.type === 'text' && (room.lastMessage?.content || '')}
                        </>
                      )}
                    </span>
                </div>
                
                {unreadCount > 0 && (
                  <span className="unread-badge">{unreadCount}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
      })}
    </div>
  );
}
