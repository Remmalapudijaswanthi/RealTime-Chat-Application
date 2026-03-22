import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';

export default function ChatLockModal({ isOpen, mode = 'verify', onVerify, onClose }) {
  const { user, setUser } = useAuth();
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
            const res = await axiosInstance.post('/api/users/profile/chat-lock/pin', { pin: finalPin });
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
        style={{ 
          zIndex: 2000, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backdropFilter: 'blur(12px)',
          background: 'rgba(0,0,0,0.8)'
        }}
      >
        <motion.div 
          className="chat-lock-card"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          style={{
            width: '100%',
            maxWidth: '320px',
            background: '#111111',
            borderRadius: '24px',
            padding: '40px 24px',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.05)'
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '40px' }}>🔒</span>
            <h2 style={{ marginTop: '16px', fontSize: '20px', fontWeight: '700', color: 'white' }}>
              {mode === 'verify' ? 'Chat Locked' : setupStep === 1 ? 'Set Up PIN' : 'Confirm PIN'}
            </h2>
            <p style={{ color: '#64748B', fontSize: '14px', marginTop: '8px' }}>
              {mode === 'verify' ? 'Enter your 4-digit PIN to continue' : 'Create a 4-digit PIN for your chats'}
            </p>
          </div>

          {/* PIN Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
            {[0, 1, 2, 3].map(i => (
              <div 
                key={i} 
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: pin.length > i ? '#C084FC' : '#1F2937',
                  border: pin.length > i ? 'none' : '1px solid #374151',
                  transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  transform: pin.length > i ? 'scale(1.2)' : 'scale(1)'
                }}
              />
            ))}
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ color: '#EF4444', fontSize: '13px', marginBottom: '20px' }}
            >
              {error}
            </motion.div>
          )}

          {/* Keypad */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '16px',
            maxWidth: '240px',
            margin: '0 auto' 
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button 
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                style={{
                  height: '60px',
                  width: '60px',
                  borderRadius: '50%',
                  background: '#1A1A1A',
                  border: 'none',
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                className="pin-btn-hover"
              >
                {num}
              </button>
            ))}
            <div />
            <button 
              onClick={() => handleNumberClick('0')}
              style={{
                height: '60px',
                width: '60px',
                borderRadius: '50%',
                background: '#1A1A1A',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              className="pin-btn-hover"
            >
              0
            </button>
            <button 
              onClick={handleBackspace}
              style={{
                height: '60px',
                width: '60px',
                borderRadius: '50%',
                background: 'none',
                border: 'none',
                color: '#64748B',
                fontSize: '18px',
                cursor: 'pointer',
              }}
            >
              ⌫
            </button>
          </div>

          <button 
            onClick={onClose}
            style={{ 
              marginTop: '32px', 
              background: 'none', 
              border: 'none', 
              color: '#64748B', 
              fontSize: '14px', 
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
