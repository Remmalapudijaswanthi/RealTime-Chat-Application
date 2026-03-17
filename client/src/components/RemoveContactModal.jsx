import { motion, AnimatePresence } from 'framer-motion';

export default function RemoveContactModal({ isOpen, onClose, onConfirm, contactName }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="modal-overlay">
        <motion.div
          className="modal-card"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          <div className="modal-header">
            <h3>Remove Contact?</h3>
            <button className="close-btn" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="modal-body">
            <p className="modal-text">
              Are you sure you want to remove <strong>{contactName}</strong> from your contacts? You will no longer see them in your chat list.
            </p>
          </div>
          <div className="modal-footer">
            <button className="btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-danger" onClick={onConfirm}>
              Remove
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
