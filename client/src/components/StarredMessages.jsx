import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../utils/axiosInstance';
import { formatMessageTime } from '../utils/formatTime';

export default function StarredMessages({ isOpen, onClose, onGoToMessage }) {
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
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 4000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(10px)'
    }}>
      <motion.div 
        className="starred-modal"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        style={{
          width: '450px',
          height: '100%',
          position: 'absolute',
          right: 0,
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
        }}
      >
        <div className="starred-header" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '24px' }}>←</button>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Starred Messages</h2>
          <span style={{ background: 'rgba(124,58,237,0.2)', color: '#C084FC', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
            {messages.length}
          </span>
        </div>

        <div className="starred-list" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <div className="spinner" />
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
              <h3 style={{ color: 'var(--text-primary)' }}>No starred messages</h3>
              <p>Messages you star will appear here for quick access.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.map(msg => (
                <motion.div 
                  key={msg._id}
                  className="starred-item"
                  onClick={() => onGoToMessage(msg.room._id, msg._id)}
                  whileHover={{ scale: 1.02 }}
                  style={{
                    background: 'var(--bg-surface)',
                    borderRadius: '16px',
                    padding: '16px',
                    cursor: 'pointer',
                    border: '1px solid var(--border)',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', color: '#C084FC', fontSize: '13px' }}>{msg.sender?.username}</span>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>{formatMessageTime(msg.createdAt)}</span>
                  </div>
                  
                  <div style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.5', wordBreak: 'break-word' }}>
                    {msg.type === 'text' ? msg.content : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontStyle: 'italic' }}>
                         📎 {msg.type.charAt(0).toUpperCase() + msg.type.slice(1)} Message
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🗨️ {msg.room?.name || 'Private Chat'}
                    </div>
                    <button 
                      onClick={(e) => unstarMessage(e, msg._id)}
                      style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '12px', cursor: 'pointer', opacity: 0.6 }}
                      onMouseEnter={e => e.target.style.opacity = 1}
                      onMouseLeave={e => e.target.style.opacity = 0.6}
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
  );
}
