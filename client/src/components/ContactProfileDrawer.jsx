import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';

export default function ContactProfileDrawer({ contact, isOpen, onClose }) {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  // Find existing nickname
  const existingContact = user?.contacts?.find(c => c.user === contact?._id || c.user?._id === contact?._id);
  const currentNickname = existingContact?.nickname || contact?.username || '';

  useEffect(() => {
    if (isOpen) {
      setNickname(currentNickname);
      setIsEditing(false);
    }
  }, [isOpen, currentNickname]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.patch(`/api/users/contacts/${contact._id}/nickname`, { nickname });
      setUser(prev => ({ ...prev, contacts: res.data }));
      setIsEditing(false);
      // Optional: Show toast "Contact name updated"
    } catch (err) {
      console.error('Failed to update nickname', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setNickname(currentNickname);
    setIsEditing(false);
  };

  if (!contact) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ zIndex: 1000 }}
          />
          <motion.div 
            className="profile-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '100%',
              maxWidth: '400px',
              height: '100vh',
              background: '#0D0D0D',
              zIndex: 1001,
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Header / Banner */}
            <div style={{ height: '180px', background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)', position: 'relative' }}>
              <button 
                onClick={onClose}
                style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', zIndex: 10 }}
              >
                ✕
              </button>
              <div style={{ position: 'absolute', bottom: '-45px', left: '24px' }}>
                <img 
                  src={contact.avatar} 
                  alt={contact.username} 
                  style={{ width: '90px', height: '90px', borderRadius: '50%', border: '4px solid #0D0D0D', objectFit: 'cover' }}
                />
              </div>
            </div>

            <div style={{ padding: '60px 24px 24px', flex: 1, overflowY: 'auto' }}>
              {/* Name Section */}
              <div style={{ marginBottom: '24px' }}>
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      autoFocus
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') handleCancel();
                      }}
                      style={{
                        background: '#1A1A1A',
                        border: '1.5px solid #C084FC',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        color: '#F8FAFC',
                        fontSize: '18px',
                        fontWeight: '600',
                        width: 'auto',
                        minWidth: '150px'
                      }}
                    />
                    <button onClick={handleSave} style={{ color: '#22C55E', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✓</button>
                    <button onClick={handleCancel} style={{ color: '#F87171', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✗</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '700', margin: 0 }}>{currentNickname}</h2>
                    <button 
                      onClick={() => setIsEditing(true)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', fontSize: '14px' }}
                    >
                      ✏️
                    </button>
                  </div>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '14px', color: '#C084FC' }}>@{contact.username}</span>
                  <span title="Username cannot be changed" style={{ cursor: 'help' }}>🔒</span>
                </div>
                
                {existingContact?.nickname && (
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                    Real name: {contact.username}
                  </div>
                )}
              </div>

              {/* Info Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: '#6B7280', marginBottom: '4px', letterSpacing: '0.05em' }}>About</label>
                  <p style={{ margin: 0, fontSize: '15px' }}>{contact.bio || 'No bio yet'}</p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: '#6B7280', marginBottom: '4px', letterSpacing: '0.05em' }}>Email</label>
                  <p style={{ margin: 0, fontSize: '15px', color: '#94A3B8' }}>{contact.email}</p>
                </div>
              </div>

              <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button className="outline-btn" style={{ width: '100%', justifyContent: 'flex-start', padding: '12px', borderRadius: '12px' }}>
                  <span style={{ marginRight: '10px' }}>🔔</span> Mute Notifications
                </button>
                <button className="outline-btn" style={{ width: '100%', justifyContent: 'flex-start', padding: '12px', borderRadius: '12px', color: '#EF4444' }}>
                  <span style={{ marginRight: '10px' }}>🚫</span> Block User
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
