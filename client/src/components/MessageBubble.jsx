import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMessageTime } from '../utils/formatTime';
import SeenIndicator from './SeenIndicator';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const isEmojiOnly = (text) => {
  if (!text) return false;
  // eslint-disable-next-line no-misleading-character-class
  const emojiRegex = /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\s]+$/u;
  return emojiRegex.test(text.trim());
};

const emojiCount = (text) => {
  const matches = text.match(/\p{Emoji}/gu);
  return matches ? matches.length : 0;
};

export default function MessageBubble({
  message,
  isOwn,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  onPin,
  onScrollToMessage,
  showAvatar,
  userId,
  isStarred,
  onStar,
  onUnstar,
  onForward,
  isGroupChat,
}) {
  const [showActions, setShowActions] = useState(false);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 });
  const [showLightbox, setShowLightbox] = useState(false);
  const [downloaded, setDownloaded] = useState(() => localStorage.getItem(`downloaded_${message._id}`) === 'true');
  const bubbleRef = useRef(null);

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const closeAllPopups = () => {
    setShowReactionPicker(false);
    setShowContextMenu(false);
  };

  // Render media content
  const renderMedia = () => {
    switch (message.type) {
      case 'image':
        return (
          <>
            <div className="msg-media msg-image" onClick={() => setShowLightbox(true)} style={{ cursor: 'pointer' }}>
              <img src={message.content} alt="shared" loading="lazy" style={{ maxWidth: '100%', borderRadius: '12px' }} />
              {message.caption && <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>{message.caption}</p>}
            </div>
            <AnimatePresence>
              {showLightbox && (
                <motion.div
                  className="lightbox-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowLightbox(false)}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
                >
                  <button onClick={() => setShowLightbox(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#FFF', fontSize: '24px', cursor: 'pointer' }}>✕</button>
                  <motion.img 
                    src={message.content} 
                    alt="fullscreen" 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.8 }}
                    style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain' }}
                    onClick={e => e.stopPropagation()}
                  />
                  {message.caption && <p style={{ color: '#FFF', marginTop: '16px', fontSize: '1.1rem' }}>{message.caption}</p>}
                  <a href={message.content} download={`image-${message._id}.png`} onClick={e => e.stopPropagation()} style={{ marginTop: '20px', padding: '10px 20px', background: 'var(--accent-purple)', color: '#FFF', textDecoration: 'none', borderRadius: '8px' }}>
                    Download Image
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        );
      case 'video':
        return (
          <div className="msg-media msg-video">
            <video controls preload="metadata" style={{ maxWidth: 280, borderRadius: 12 }}>
              <source src={message.content} />
            </video>
            {message.caption && <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>{message.caption}</p>}
          </div>
        );
      case 'document':
      case 'file': {
        const caption = message.caption || '';
        
        // Split by ||| separator
        const parts = caption.split('|||');
        // Handle fallback to payload's native fileName/fileSize if present implicitly
        const fileName = parts[0] && parts[0] !== 'undefined' ? parts[0] : (message.fileName || 'document');
        const fileSize = parts[1] || message.fileSize || '';
        
        // Get file extension for icon color
        const ext = fileName.split('.').pop().toLowerCase();
        
        const iconColors = {
          pdf: '#EF4444',
          doc: '#3B82F6',
          docx: '#3B82F6',
          xls: '#22C55E',
          xlsx: '#22C55E',
          ppt: '#F97316',
          pptx: '#F97316',
          txt: '#6B7280',
          zip: '#EAB308'
        };
        const iconColor = iconColors[ext] || '#6B7280';
        
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.15)',
            borderRadius: 12,
            minWidth: 200,
            maxWidth: 260
          }}>
            {/* File type icon */}
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 10,
              color: 'white',
              fontWeight: 700,
              textTransform: 'uppercase'
            }}>
              {ext}
            </div>
            
            {/* File info */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'inherit',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {fileName}
              </div>
              <div style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.6)',
                marginTop: 2
              }}>
                {fileSize || 'Document'}
              </div>
            </div>
            
            {/* Download button — hidden after download */}
            {!downloaded && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Create download link programmatically
                  const link = document.createElement('a');
                  link.href = message.content;
                  link.download = fileName;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  
                  // Mark as downloaded
                  setDownloaded(true);
                  localStorage.setItem(`downloaded_${message._id}`, 'true');
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 14,
                  transition: 'all 0.2s'
                }}
              >
                ⬇
              </button>
            )}

            {/* Show checkmark after download */}
            {downloaded && (
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(34,197,94,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 14,
                color: '#22C55E'
              }}>
                ✓
              </div>
            )}
          </div>
        );
      }
      case 'audio':
      case 'voice':
        return (
          <div className="msg-voice" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <audio controls src={message.content} style={{ width: '250px', height: '40px' }} />
            {message.caption && <p style={{ margin: 0, fontSize: '0.9rem' }}>{message.caption}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  const showAvatarInBubble = !isOwn && showAvatar;
  const showNameInBubble = isGroupChat && !isOwn && showAvatar;

  return (
    <motion.div
      className={`message-wrapper ${isOwn ? 'own' : 'other'}`}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      layout
      onMouseEnter={() => { setShowActions(true); setShowTimestamp(true); }}
      onMouseLeave={() => { setShowActions(false); setShowTimestamp(false); closeAllPopups(); }}
      onContextMenu={handleContextMenu}
      ref={bubbleRef}
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        gap: '8px',
        width: '100%',
        padding: '2px 16px',
        marginBottom: showAvatar ? '4px' : '1px'
      }}
    >
      {!isOwn && (
        <div style={{ width: '28px', height: '28px', flexShrink: 0, alignSelf: 'flex-end', marginBottom: '2px' }}>
          {showAvatarInBubble ? (
            message.sender?.avatar ? (
              <img
                src={message.sender?.avatar}
                alt={message.sender?.username}
                className="message-avatar"
                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ 
                width: '28px', 
                height: '28px', 
                borderRadius: '50%', 
                background: `var(--avatar-bg, #7C3AED)`, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'white', 
                fontSize: '11px', 
                fontWeight: '700' 
              }}>
                {message.sender?.username?.substring(0, 2).toUpperCase()}
              </div>
            )
          ) : (
            <div style={{ width: '28px', height: '28px' }} />
          )}
        </div>
      )}

      <div 
        className={`message-bubble ${isOwn ? 'sent' : 'received'}`}
        style={{
          position: 'relative',
          maxWidth: '65%',
          minWidth: '85px',
          padding: '8px 12px 6px',
          borderRadius: isOwn 
            ? '16px 16px 4px 16px'
            : '16px 16px 16px 4px',
          background: (message.type === 'text' && isEmojiOnly(message.content))
            ? 'transparent'
            : isOwn 
              ? 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)' 
              : 'var(--bg-secondary)',
          color: isOwn ? 'white' : 'var(--text-primary)',
          boxShadow: (message.type === 'text' && isEmojiOnly(message.content)) ? 'none' : '0 1px 2px rgba(0,0,0,0.1)',
          border: isOwn ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}
      >
        {showNameInBubble && (
          <span 
            className="message-sender-name"
            style={{ 
              fontSize: '13px', 
              fontWeight: '700', 
              color: 'var(--theme-accent)', 
              marginBottom: '2px',
              display: 'block'
            }}
          >
            {message.sender?.username}
          </span>
        )}

        {/* Forwarded Label */}
        {message.forwardedFrom?.messageId && (
          <div className="forwarded-label" style={{ 
            fontSize: '11px', 
            color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', 
            fontStyle: 'italic', 
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 3 21 3 21 9"/><path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/><path d="M8 21s2-5 7-3"/><path d="M21 3L9 15"/></svg>
            Forwarded
          </div>
        )}

        {/* Reply quote */}
        {message.replyTo?.messageId && (
          <div
            className="reply-quote"
            onClick={() => onScrollToMessage?.(message.replyTo.messageId)}
            style={{
              background: isOwn ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
              borderLeft: `4px solid ${isOwn ? 'white' : 'var(--accent)'}`,
              borderRadius: '8px',
              padding: '6px 10px',
              marginBottom: '6px',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            <div style={{ fontWeight: '700', color: isOwn ? 'white' : 'var(--accent)', fontSize: '12px' }}>{message.replyTo.senderName}</div>
            <div style={{ opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {message.replyTo.content}
            </div>
          </div>
        )}

        {/* Media or text content */}
        <div style={{ position: 'relative' }}>
          {message.type !== 'text' ? renderMedia() : null}
          {message.type === 'text' && (() => {
            const text = message.content;
            const onlyEmoji = isEmojiOnly(text);
            const count = emojiCount(text);
            
            if (onlyEmoji) {
              const size = count <= 1 ? '52px' : count <= 3 ? '40px' : count <= 6 ? '32px' : '24px';
              return (
                <span style={{ fontSize: size, lineHeight: 1.2, background: 'transparent', display: 'block', padding: '4px 0' }}>
                  {text}
                </span>
              );
            }
            return (
              <p className="message-content" style={{ margin: 0, fontSize: '15.5px', lineHeight: '1.45', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {text}
              </p>
            );
          })()}
        </div>

        {/* Timestamp Pill */}
        <div 
          className="message-status-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '4px',
            marginTop: '4px',
            alignSelf: 'flex-end'
          }}
        >
          <div style={{
            background: isOwn ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
            borderRadius: '10px',
            padding: '2px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {isStarred && <span style={{ color: '#EAB308', fontSize: '10px' }}>⭐</span>}
            <span style={{ 
              fontSize: '10px', 
              fontWeight: '600', 
              color: isOwn ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-muted)' 
            }}>
              {formatMessageTime(message.createdAt)}
            </span>
            {isOwn && (
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <SeenIndicator status={message.read ? 'read' : message.delivered ? 'delivered' : 'sent'} />
              </span>
            )}
          </div>
        </div>

        {/* Context Menu */}
        <AnimatePresence>
          {showContextMenu && (
            <>
              <div 
                style={{ position: 'fixed', inset: 0, zIndex: 1999 }} 
                onClick={() => setShowContextMenu(false)} 
              />
              <motion.div
                className="context-menu-vertical"
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  bottom: contextPos.y < 350 ? 'auto' : 'calc(100% + 8px)',
                  top: contextPos.y < 350 ? 'calc(100% + 8px)' : 'auto',
                  [isOwn ? 'right' : 'left']: 0,
                  zIndex: 2000,
                  background: '#1E1E2E',
                  border: '1px solid #2A2A2A',
                  borderRadius: '12px',
                  padding: '4px',
                  minWidth: '160px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                <button 
                  onClick={() => { onReply?.(message); setShowContextMenu(false); }} 
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', width: '100%', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '18px' }}>↩️</span> Reply
                </button>
                
                <button 
                  onClick={() => { onForward?.(message); setShowContextMenu(false); }} 
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', width: '100%', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '18px' }}>↪️</span> Forward
                </button>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowReactionPicker(true); setShowContextMenu(false); }} 
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', width: '100%', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '18px' }}>😊</span> React
                </button>
                
                <button 
                  onClick={() => { if (isStarred) onUnstar?.(message._id); else onStar?.(message._id); setShowContextMenu(false); }} 
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', width: '100%', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '18px' }}>⭐</span> {isStarred ? 'Unstar' : 'Star'}
                </button>

                <button 
                  onClick={() => { navigator.clipboard.writeText(message.content); setShowContextMenu(false); }} 
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', width: '100%', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '18px' }}>📋</span> Copy
                </button>

                <button 
                  onClick={() => { onPin?.(message._id); setShowContextMenu(false); }} 
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', width: '100%', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '18px' }}>📌</span> Pin
                </button>

                {isOwn && (
                  <>
                    <button 
                      onClick={() => { onEdit?.(message); setShowContextMenu(false); }} 
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', width: '100%', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '14px', textAlign: 'left', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: '18px' }}>✏️</span> Edit
                    </button>

                    <div style={{ height: '1px', background: '#2A2A2A', margin: '4px 0' }} />
                    <button 
                      onClick={() => { onDelete(message._id); setShowContextMenu(false); }} 
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', width: '100%', border: 'none', background: 'transparent', color: '#F87171', fontSize: '14px', textAlign: 'left', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: '18px' }}>🗑️</span> Delete
                    </button>
                  </>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
