import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';

export default function ChatLockModal({ isOpen, mode = 'verify', onVerify, onClose }) {
  const { setUser } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupStep, setSetupStep] = useState(1); // 1 = Enter new, 2 = Confirm
  const [firstPin, setFirstPin] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
      setSetupStep(1);
    }
  }, [isOpen]);

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        handleAutoSubmit(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleAutoSubmit = async (finalPin) => {
    if (mode === 'verify') {
      try {
        setLoading(true);
        const res = await axiosInstance.post('/api/users/profile/chat-lock/verify', { pin: finalPin });
        if (res.data.success) {
          onVerify(finalPin);
        }
      } catch (err) {
        setError('Incorrect PIN. Please try again.');
        setPin('');
      } finally {
        setLoading(false);
      }
    } else if (mode === 'setup') {
      if (setupStep === 1) {
        setFirstPin(finalPin);
        setPin('');
        setSetupStep(2);
      } else {
        if (finalPin === firstPin) {
          try {
            setLoading(true);
            await axiosInstance.post('/api/users/profile/chat-lock/pin', { pin: finalPin });
            setUser(prev => ({ ...prev, settings: { ...prev.settings, chatLockPin: 'exists' } }));
            onVerify(finalPin);
          } catch (err) {
            setError('Failed to set PIN');
          } finally {
            setLoading(false);
          }
        } else {
          setError('PINs do not match. Try again.');
          setPin('');
          setSetupStep(1);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="chat-lock-card"
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="chat-lock-header">
            <div className="chat-lock-icon">🔒</div>
            <h2 className="chat-lock-title">
              {mode === 'verify' ? 'Chat Locked' : setupStep === 1 ? 'Set Up PIN' : 'Confirm PIN'}
            </h2>
            <p className="chat-lock-subtitle">
              {mode === 'verify' ? 'Enter your 4-digit PIN to continue' : 'Create a 4-digit PIN for your chats'}
            </p>
          </div>

          <div className="pin-dots-container">
            {[0, 1, 2, 3].map(i => (
              <div 
                key={i} 
                className={`pin-dot ${pin.length > i ? 'active' : ''}`}
              />
            ))}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                className="chat-lock-error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="keypad-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button 
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="keypad-btn"
                disabled={loading}
              >
                {num}
              </button>
            ))}
            <div className="keypad-spacer"></div>
            <button 
              onClick={() => handleNumberClick('0')}
              className="keypad-btn"
              disabled={loading}
            >
              0
            </button>
            <button 
              onClick={handleBackspace}
              className="keypad-btn keypad-btn-special"
              disabled={loading}
            >
              ⌫
            </button>
          </div>

          <button 
            onClick={onClose}
            className="chat-lock-cancel-btn"
          >
            Cancel
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
