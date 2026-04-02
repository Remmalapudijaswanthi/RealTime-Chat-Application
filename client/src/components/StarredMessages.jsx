import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../utils/axiosInstance';
import { formatMessageTime } from '../utils/formatTime';
import { useAuth } from '../context/AuthContext';

export default function StarredMessages({ isOpen, onClose, onGoToMessage }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchStarred();
    }
  }, [isOpen]);

  const fetchStarred = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/api/users/starred');
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch starred messages', err);
    } finally {
      setLoading(false);
    }
  };

  const unstarMessage = async (e, messageId) => {
    e.stopPropagation();
    try {
      await axiosInstance.delete(`/api/chats/message/${messageId}/star`);
      setMessages(prev => prev.filter(m => m._id !== messageId));
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay" onClick={onClose}>
        <motion.div
          className="modal-content starred-modal"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="starred-header">
            <div className="starred-header-left">
              <button onClick={onClose} className="starred-back-btn">←</button>
              <h2 className="starred-title">Starred</h2>
            </div>
            <span className="starred-count-badge">
              {messages.length}
            </span>
          </div>

          <div className="starred-body">
            {loading ? (
              <div className="starred-loading">
                <div className="starred-spinner" />
              </div>
            ) : messages.length === 0 ? (
              <div className="starred-empty-state">
                <div className="empty-state-icon">⭐</div>
                <h3 className="empty-state-text">No starred messages</h3>
                <p className="empty-state-sub">Messages you star will appear here for quick access.</p>
              </div>
            ) : (
              <div className="starred-list">
                {messages.map(msg => (
                  <motion.div 
                    key={msg._id}
                    className="starred-item"
                    onClick={() => onGoToMessage(msg.room._id, msg._id)}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="starred-item-header">
                      <span className="starred-item-sender">
                        {msg.sender?._id === user?._id ? 'You' : msg.sender?.username}
                      </span>
                      <span className="starred-item-time">{formatMessageTime(msg.createdAt)}</span>
                    </div>
                    
                    <div className="starred-item-content">
                      {msg.type === 'text' ? msg.content : (
                        <div className="starred-item-attachment">
                           📎 {msg.type.charAt(0).toUpperCase() + msg.type.slice(1)} Message
                        </div>
                      )}
                    </div>
                    
                    <div className="starred-item-footer">
                      <div className="starred-item-room">
                        🗨️ {msg.room?.name || 'Private Chat'}
                      </div>
                      <button 
                        onClick={(e) => unstarMessage(e, msg._id)}
                        className="starred-item-unstar-btn"
                      >
                        Unstar
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
