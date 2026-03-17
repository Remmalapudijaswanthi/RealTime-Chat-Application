import { motion, AnimatePresence } from 'framer-motion';
import { formatTime } from '../utils/formatTime';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

export default function RoomList({
  rooms,
  currentRoom,
  onSelectRoom,
  getRoomName,
  getRoomAvatar,
  isRoomOnline,
  unreadCounts,
  typingUsers,
  onContextMenu,
}) {
  if (rooms.length === 0) {
    return (
      <div className="rooms-empty">
        <p>No conversations yet</p>
        <p className="rooms-empty-sub">Search for users to start chatting</p>
      </div>
    );
  }

  return (
    <motion.div
      className="room-list"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <AnimatePresence>
        {rooms.map((room) => {
          const isActive = currentRoom?._id === room._id;
          const unread = unreadCounts[room._id] || 0;
          const typingUser = typingUsers[room._id];
          const lastMsg = room.lastMessage;

          return (
            <motion.div
              key={room._id}
              className={`room-item ${isActive ? 'active' : ''}`}
              variants={itemVariants}
              onClick={() => onSelectRoom(room)}
              onContextMenu={(e) => onContextMenu(e, room)}
              whileHover={{ backgroundColor: isActive ? undefined : 'rgba(124, 58, 237, 0.08)' }}
              layout
            >
              <div className="room-avatar-wrapper">
                <img src={getRoomAvatar(room)} alt={getRoomName(room)} className="room-avatar" />
                {isRoomOnline(room) && <span className="online-dot pulse" />}
              </div>
              <div className="room-info">
                <div className="room-info-top">
                  <span className="room-name">{getRoomName(room)}</span>
                  {lastMsg && (
                    <span className="room-time">{formatTime(lastMsg.createdAt || room.updatedAt)}</span>
                  )}
                </div>
                <div className="room-info-bottom">
                  {typingUser ? (
                    <span className="room-typing">{typingUser.username} is typing...</span>
                  ) : lastMsg ? (
                    <span className="room-last-message">
                      {lastMsg.sender?.username && `${lastMsg.sender.username}: `}
                      {lastMsg.content?.substring(0, 40)}
                      {lastMsg.content?.length > 40 ? '...' : ''}
                    </span>
                  ) : (
                    <span className="room-last-message empty">No messages yet</span>
                  )}
                  {unread > 0 && (
                    <motion.span
                      className="unread-badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    >
                      {unread}
                    </motion.span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
