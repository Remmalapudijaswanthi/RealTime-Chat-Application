import { motion, AnimatePresence } from 'framer-motion';

export default function ContactDrawer({ isOpen, onClose, contact, isOnline }) {
  if (!contact) return null;

  const formatLastSeen = (date) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1)   return 'Just now';
    if (diff < 60)  return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString();
  };

  const statusColor = {
    Online: '#22c55e',
    Away: '#f59e0b',
    Busy: '#ef4444',
    Invisible: '#6b7280',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            className="contact-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            {/* Close button */}
            <button className="drawer-close" onClick={onClose}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Profile section */}
            <div className="drawer-profile">
              <div className="drawer-avatar-wrapper">
                <img
                  src={contact.avatar || `https://ui-avatars.com/api/?name=${contact.username}&background=7c3aed&color=fff&bold=true&size=200`}
                  alt={contact.username}
                  className="drawer-avatar"
                />
                {isOnline && <span className="drawer-online-dot pulse" />}
              </div>
              <h2 className="drawer-name">{contact.username}</h2>
              {contact.bio && <p className="drawer-bio">{contact.bio}</p>}
            </div>

            {/* Info rows */}
            <div className="drawer-info-list">
              <div className="drawer-info-row">
                <span className="drawer-info-label">Status</span>
                <span className="drawer-info-value" style={{ color: statusColor[contact.status] || '#94a3b8' }}>
                  <span className="status-indicator" style={{ background: statusColor[contact.status] || '#6b7280' }} />
                  {isOnline ? 'Online' : (contact.status || 'Offline')}
                </span>
              </div>

              {contact.email && (
                <div className="drawer-info-row">
                  <span className="drawer-info-label">Email</span>
                  <span className="drawer-info-value">{contact.email}</span>
                </div>
              )}

              <div className="drawer-info-row">
                <span className="drawer-info-label">Last Seen</span>
                <span className="drawer-info-value">
                  {isOnline ? 'Right now' : formatLastSeen(contact.lastSeen)}
                </span>
              </div>

              <div className="drawer-info-row">
                <span className="drawer-info-label">Member Since</span>
                <span className="drawer-info-value">
                  {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
