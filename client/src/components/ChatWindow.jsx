import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { formatLastSeen } from '../utils/formatTime';

export default function ChatWindow({
  currentRoom,
  messages,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onStartTyping,
  onStopTyping,
  typingUsers,
  loadingMessages,
  hasMoreMessages,
  onLoadMore,
  onBack,
}) {
  const [inputValue, setInputValue] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { user } = useAuth();
  const { onlineUsers } = useSocket();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle scroll to load more
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop === 0 && hasMoreMessages && !loadingMessages) {
      onLoadMore();
    }
  }, [hasMoreMessages, loadingMessages, onLoadMore]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);

    // Typing indicator logic
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onStartTyping();
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    if (editingMessage) {
      onEditMessage(editingMessage._id, inputValue.trim());
      setEditingMessage(null);
    } else {
      onSendMessage(inputValue.trim());
    }

    setInputValue('');
    onStopTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape' && editingMessage) {
      setEditingMessage(null);
      setInputValue('');
    }
  };

  const handleEdit = (message) => {
    setEditingMessage(message);
    setInputValue(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputValue('');
  };

  // Empty state
  if (!currentRoom) {
    return (
      <div className="chat-window empty-state">
        <motion.div
          className="empty-state-content"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="empty-state-icon">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <rect width="80" height="80" rx="24" fill="url(#empty-grad)" opacity="0.1" />
              <path d="M24 40C24 31.16 31.16 24 40 24C48.84 24 56 31.16 56 40C56 48.84 48.84 56 40 56C37.8 56 35.7 55.56 33.8 54.76L24 56L26.4 48.4C24.88 45.92 24 43.04 24 40Z" fill="url(#empty-grad)" opacity="0.6" />
              <defs>
                <linearGradient id="empty-grad" x1="0" y1="0" x2="80" y2="80">
                  <stop stopColor="#7c3aed" />
                  <stop offset="1" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h3>Welcome to ChatFlow</h3>
          <p>Select a conversation or search for users to start chatting</p>
        </motion.div>
      </div>
    );
  }

  const otherMember = currentRoom.type === 'private'
    ? currentRoom.members?.find((m) => m._id !== user?._id)
    : null;

  const roomName = currentRoom.type === 'group'
    ? currentRoom.name
    : otherMember?.username || 'Unknown';

  const roomAvatar = currentRoom.type === 'group'
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(currentRoom.name)}&background=06b6d4&color=fff&bold=true&size=128`
    : otherMember?.avatar || '';

  const isOnline = currentRoom.type === 'private' && otherMember
    ? onlineUsers.has(otherMember._id)
    : false;

  const memberCount = currentRoom.type === 'group'
    ? currentRoom.members?.length || 0
    : 0;

  const typingUser = typingUsers[currentRoom._id];

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="chat-header-avatar-wrapper">
          <img src={roomAvatar} alt={roomName} className="chat-header-avatar" />
          {isOnline && <span className="online-dot pulse" />}
        </div>
        <div className="chat-header-info">
          <h3 className="chat-header-name">{roomName}</h3>
          <span className="chat-header-status">
            {currentRoom.type === 'group' ? (
              `${memberCount} members`
            ) : isOnline ? (
              <span className="status-online">Online</span>
            ) : (
              formatLastSeen(otherMember?.lastSeen)
            )}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        className="chat-messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {loadingMessages && (
          <div className="loading-messages">
            <div className="spinner" />
          </div>
        )}

        {hasMoreMessages && !loadingMessages && (
          <div className="load-more">
            <button onClick={onLoadMore} className="load-more-btn">
              Load older messages
            </button>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <MessageBubble
              key={message._id}
              message={message}
              isOwn={message.sender?._id === user?._id}
              onEdit={handleEdit}
              onDelete={onDeleteMessage}
              showAvatar={
                index === 0 ||
                messages[index - 1]?.sender?._id !== message.sender?._id
              }
            />
          ))}
        </AnimatePresence>

        {typingUser && <TypingIndicator username={typingUser.username} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-container">
        <AnimatePresence>
          {editingMessage && (
            <motion.div
              className="editing-bar"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="editing-info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Editing message</span>
              </div>
              <button className="cancel-edit-btn" onClick={handleCancelEdit}>Cancel</button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="chat-input-wrapper">
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />
          <motion.button
            className="send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            whileTap={{ scale: 0.85 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
