import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatMessageTime } from '../utils/formatTime';
import ContextMenu from './ContextMenu';

export default function MessageBubble({ message, isOwn, onEdit, onDelete, showAvatar }) {
  const [showActions, setShowActions] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

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

      <div className={`message-bubble ${isOwn ? 'sent' : 'received'} ${message.deletedForEveryone ? 'deleted' : ''}`}>
        {!isOwn && showAvatar && (
          <span className="message-sender-name">{message.sender?.username}</span>
        )}

        {/* Content by type */}
        {message.deletedForEveryone ? (
          <div className="message-deleted-state">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <em>This message was deleted</em>
          </div>
        ) : message.type === 'image' ? (
          <div className="msg-image-wrapper">
            <img
              src={message.content}
              alt="shared image"
              className="msg-image"
              onClick={() => window.open(message.content, '_blank')}
            />
          </div>
        ) : message.type === 'file' ? (
          <a
            href={message.content}
            download={message.fileName || 'file'}
            className="msg-file"
            target="_blank"
            rel="noreferrer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <div className="msg-file-info">
              <span className="msg-file-name">{message.fileName || 'Download file'}</span>
              {message.fileSize && (
                <span className="msg-file-size">{(message.fileSize / 1024).toFixed(1)} KB</span>
              )}
            </div>
          </a>
        ) : (
          <p className="message-content">{message.content}</p>
        )}

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
        {isOwn && showActions && !message.deletedForEveryone && (
          <motion.div
            className="message-actions"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            {message.type === 'text' && (
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
            )}
            <button
              className="action-btn delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                setContextMenu({ x: e.clientX, y: e.clientY });
              }}
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

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          options={[
            {
              label: 'Delete for me',
              onClick: () => onDelete(message._id, 'me'),
            },
            {
              label: 'Delete for everyone',
              onClick: () => onDelete(message._id, 'everyone'),
              danger: true,
            },
          ]}
        />
      )}
    </motion.div>
  );
}
