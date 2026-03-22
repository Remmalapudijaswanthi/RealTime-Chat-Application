import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function OTPInput({ length = 6, onComplete, error, success }) {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (element, index) => {
    if (isNaN(element.value)) return false;

    setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);

    // Focus next input
    if (element.value !== '' && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        inputRefs.current[index - 1].focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text').slice(0, length).split('');
    const newOtp = [...otp];
    data.forEach((value, index) => {
      if (index < length && !isNaN(value)) {
        newOtp[index] = value;
      }
    });
    setOtp(newOtp);
    const lastIndex = Math.min(data.length, length) - 1;
    if (inputRefs.current[lastIndex]) {
      inputRefs.current[lastIndex].focus();
    }
  };

  useEffect(() => {
    if (otp.join('').length === length) {
      onComplete(otp.join(''));
    }
  }, [otp, length, onComplete]);

  // Reset OTP if error occurs (optional, based on requirement "Boxes clear automatically")
  useEffect(() => {
    if (error) {
      setTimeout(() => setOtp(new Array(length).fill('')), 1000);
    }
  }, [error, length]);

  return (
    <div className="otp-container" style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '24px 0' }}>
      {otp.map((data, index) => (
        <motion.input
          key={index}
          type="text"
          inputMode="numeric"
          maxLength={1}
          ref={(el) => (inputRefs.current[index] = el)}
          value={data}
          onChange={(e) => handleChange(e.target, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          animate={error ? { x: [0, -8, 8, -6, 6, -4, 4, 0] } : success ? { scale: [1, 1.05, 1], borderColor: '#10b981' } : {}}
          transition={{ duration: 0.5 }}
          style={{
            width: '48px',
            height: '56px',
            background: '#1A1A1A',
            border: `1.5px solid ${error ? '#ef4444' : success ? '#10b981' : data ? '#818CF8' : '#2A2A2A'}`,
            borderRadius: '12px',
            fontSize: '24px',
            fontWeight: '700',
            textAlign: 'center',
            color: '#C084FC',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: data && !error && !success ? '0 0 10px rgba(129, 140, 248, 0.2)' : 'none'
          }}
          onFocus={(e) => (e.target.style.border = '1.5px solid #C084FC')}
          onBlur={(e) => (e.target.style.border = `1.5px solid ${error ? '#ef4444' : success ? '#10b981' : data ? '#818CF8' : '#2A2A2A'}`)}
        />
      ))}
    </div>
  );
}
