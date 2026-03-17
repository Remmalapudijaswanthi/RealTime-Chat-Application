import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ContextMenu({ x, y, options, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    // Close when clicking outside
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        className="context-menu"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        style={{
          position: 'fixed',
          top: y,
          left: x,
          zIndex: 1000,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          padding: '4px',
          minWidth: '160px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}
      >
        {options.map((opt, idx) => (
          <button
            key={idx}
            className={`context-menu-item ${opt.danger ? 'danger' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              opt.onClick();
              onClose();
            }}
            style={{
              padding: '8px 12px',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: opt.danger ? 'var(--danger)' : 'var(--text-primary)',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              transition: 'background var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = opt.danger 
                ? 'rgba(239, 68, 68, 0.1)' 
                : 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {opt.label}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
