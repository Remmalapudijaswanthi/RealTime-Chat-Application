import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatMessageTime } from '../utils/formatTime';

export default function MessageBubble({ message, isOwn, onEdit, onDelete, showAvatar }) {
  const [showActions, setShowActions] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);

  return (
    <motion.div
      className={`message-bubble-wrapper ${isOwn ? 'own' : 'other'}`}
      initial={{ opacity: 0, x: isOwn ? 30 : -30, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      layout
      onMouseEnter={() => { setShowActions(true); setShowTimestamp(true); }}
      onMouseLeave={() => { setShowActions(false); setShowTimestamp(false); }}
    >
      {!isOwn && showAvatar && (
        <img
          src={message.sender?.avatar}
          alt={message.sender?.username}
          className="message-avatar"
        />
      )}
      {!isOwn && !showAvatar && <div className="message-avatar-spacer" />}

      <div className={`message-bubble ${isOwn ? 'sent' : 'received'}`}>
        {!isOwn && showAvatar && (
          <span className="message-sender-name">{message.sender?.username}</span>
        )}
        <p className="message-content">{message.content}</p>

        <div className="message-meta">
          {message.edited && <span className="message-edited">edited</span>}
          <span className={`message-time ${showTimestamp ? 'visible' : ''}`}>
            {formatMessageTime(message.createdAt)}
          </span>
          {isOwn && (
            <span className="read-receipt">
              {message.read ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 7l-8 8-2-2" />
                  <path d="M22 7l-8 8-2-2" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </span>
          )}
        </div>

        {/* Actions */}
        {isOwn && showActions && (
          <motion.div
            className="message-actions"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <button
              className="action-btn edit-btn"
              onClick={() => onEdit(message)}
              title="Edit"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              className="action-btn delete-btn"
              onClick={() => onDelete(message._id)}
              title="Delete"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
