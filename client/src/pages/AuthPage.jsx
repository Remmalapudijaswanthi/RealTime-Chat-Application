import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import OTPInput from '../components/OTPInput';
import axiosInstance from '../utils/axiosInstance';

export default function AuthPage() {
  const location = useLocation();
  const defaultTab = location.pathname === '/register' ? 'register' : 'login';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [shakeBtn, setShakeBtn] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [tabAnimating, setTabAnimating] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  // OTP & Multi-step States
  const [regStep, setRegStep] = useState(1); // 1: Info, 2: OTP, 3: Success
  const [loginMode, setLoginMode] = useState('otp'); // 'otp' or 'password'
  const [loginStep, setLoginStep] = useState(1); // 1: Email, 2: OTP
  const [forgotStep, setForgotStep] = useState(0); // 0: Off, 1: Email, 2: OTP, 3: New Pass
  const [otpCode, setOtpCode] = useState('');
  const [timer, setTimer] = useState(0);
  const [otpError, setOtpError] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  // Sync tab with URL
  useEffect(() => {
    const tab = location.pathname === '/register' ? 'register' : 'login';
    if (tab !== activeTab) {
      switchTab(tab);
    }
  }, [location.pathname]);

  const switchTab = (tab) => {
    if (tab === activeTab || tabAnimating) return;
    setTabAnimating(true);
    setError('');
    setFieldErrors({});
    setRegStep(1);
    setLoginStep(1);
    setForgotStep(0);
    // Trigger exit animation
    setTimeout(() => {
      setActiveTab(tab);
      setAnimKey(prev => prev + 1);
      setTabAnimating(false);
      // Update URL without full navigation
      window.history.replaceState(null, '', tab === 'register' ? '/register' : '/login');
    }, 250);
  };

  // Timer logic
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const maskEmail = (email) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const masked = local.slice(0, 2) + '***' + (local.length > 4 ? local.slice(-1) : '');
    return masked + '@' + domain;
  };

  const handleSendOTP = async (type) => {
    setError('');
    setFieldErrors({});
    
    // Client-side validation
    if (activeTab === 'register' && regStep === 1) {
      const errs = {};
      if (!username || username.length < 3) errs.username = 'Username must be at least 3 characters';
      if (!email) errs.email = 'Email is required';
      if (!password || password.length < 6) errs.password = 'Password must be at least 6 characters';
      if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
      if (Object.keys(errs).length) { setFieldErrors(errs); triggerShake(); return; }
    } else if (activeTab === 'login' && loginStep === 1) {
      if (!email) { setFieldErrors({ email: 'Email is required' }); triggerShake(); return; }
    } else if (forgotStep === 1) {
      if (!email) { setFieldErrors({ email: 'Email is required' }); triggerShake(); return; }
    }

    setIsLoading(true);
    try {
      const endpoint = forgotStep === 1 ? '/api/auth/forgot-password/send' : '/api/auth/send-otp';
      await axiosInstance.post(endpoint, { email, type }, { timeout: 60000 });
      
      setTimer(600); // 10 minutes
      if (activeTab === 'register') setRegStep(2);
      else if (activeTab === 'login') setLoginStep(2);
      else if (forgotStep === 1) setForgotStep(2);

      setIsLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
      triggerShake();
      setIsLoading(false);
    }
  };

  const handleVerifyRegister = async (otp) => {
    setIsLoading(true);
    setOtpError(false);
    try {
      const res = await axiosInstance.post('/api/auth/verify-register', {
        username, email, password, otp
      });
      setOtpSuccess(true);
      setTimeout(() => {
        setRegStep(3);
        // AuthContext usually handles the user state via localStorage/context
        // But we might need to manually trigger success state if register() isn't called
        // Assuming the response includes token and user
        localStorage.setItem('token', res.data.token);
        window.location.reload(); // Simple way to let AuthProvider pick up the token
      }, 1000);
    } catch (err) {
      setOtpError(true);
      setError(err.response?.data?.message || 'Invalid OTP');
      setIsLoading(false);
    }
  };

  const handleVerifyLogin = async (otp) => {
    setIsLoading(true);
    setOtpError(false);
    try {
      const res = await axiosInstance.post('/api/auth/verify-login', { email, otp });
      setOtpSuccess(true);
      setTimeout(() => {
        setSuccess(true);
        setFadeOut(true);
        localStorage.setItem('token', res.data.token);
        setTimeout(() => navigate('/'), 400);
      }, 800);
    } catch (err) {
      setOtpError(true);
      setError(err.response?.data?.message || 'Invalid OTP');
      setIsLoading(false);
    }
  };

  const handleVerifyForgot = async (otp) => {
    setIsLoading(true);
    setOtpError(false);
    try {
      // Just verify OTP first
      // Actually we need to keep the OTP to send with new password
      setOtpCode(otp);
      setOtpSuccess(true);
      setTimeout(() => {
        setForgotStep(3);
        setIsLoading(false);
      }, 800);
    } catch (err) {
      setOtpError(true);
      setError(err.response?.data?.message || 'Invalid OTP');
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    setIsLoading(true);
    try {
      await axiosInstance.post('/api/auth/forgot-password/reset', {
        email, otp: otpCode, newPassword: password
      });
      setSuccess(true);
      setTimeout(() => {
        setForgotStep(0);
        setSuccess(false);
        setError('');
        alert('Password reset successfully! Please login.');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed');
      setIsLoading(false);
    }
  };

  const triggerShake = () => {
    setShakeBtn(true);
    setTimeout(() => setShakeBtn(false), 400);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!email) { setFieldErrors(p => ({ ...p, email: 'Email is required' })); return; }
    if (!password) { setFieldErrors(p => ({ ...p, password: 'Password is required' })); return; }

    setIsLoading(true);
    try {
      await login(email, password);
      setSuccess(true);
      setFadeOut(true);
      setTimeout(() => navigate('/'), 400);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
      triggerShake();
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    const errs = {};

    if (!username || username.length < 3) errs.username = 'Username must be at least 3 characters';
    if (!email) errs.email = 'Email is required';
    if (!password || password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';

    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      await register(username, email, password);
      setSuccess(true);
      setFadeOut(true);
      setTimeout(() => navigate('/'), 400);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register');
      triggerShake();
      setIsLoading(false);
    }
  };

  const EyeOpen = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
  const EyeClosed = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );

  return (
    <div className={`auth-page ${fadeOut ? 'auth-fade-out' : ''}`}>
      {/* LEFT PANEL */}
      <div className="auth-left-panel">
        {/* Floating Bubbles */}
        <div className="auth-bubbles">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`bubble bubble-${i + 1}`} />
          ))}
        </div>

        {/* Logo centered */}
        <div className="auth-logo-section">
          <div className="auth-logo-row">
            <Logo size={64} showText={true} />
          </div>
          <p className="auth-tagline" style={{ marginTop: '12px', fontSize: '1.2rem', color: '#94A3B8', letterSpacing: '0.5px' }}>
            Ping. Connect. Chat.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-right-panel">
        {/* Mobile logo */}
        <div className="auth-mobile-logo" style={{ marginBottom: '24px' }}>
          <Logo size={42} showText={true} />
        </div>

        <div className="auth-card-v2">
          {/* Header */}
          <div className="auth-card-header">
            <h2>{activeTab === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p>{activeTab === 'login' ? 'Sign in to your account' : 'Join PingMe today'}</p>
          </div>

          {/* Tab Switcher */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => switchTab('login')}
              type="button"
            >
              Login
            </button>
            <button
              className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
              onClick={() => switchTab('register')}
              type="button"
            >
              Register
            </button>
            <div
              className="auth-tab-indicator"
              style={{ left: activeTab === 'login' ? '0%' : '50%' }}
            />
          </div>

          {/* Error Box */}
          {error && (
            <div className="auth-error-msg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {/* FORM CONTENT */}
          <div
            className={`auth-form-content ${tabAnimating ? 'exit' : 'enter'}`}
            key={animKey}
            ref={formRef}
          >
            {activeTab === 'login' ? (
              <div className="auth-form-v2">
                <AnimatePresence mode="wait">
                  {forgotStep > 0 ? (
                    <motion.div
                      key="forgot-flow"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      {forgotStep === 1 && (
                        <div className="auth-form-step">
                          <h3 style={{ color: '#F8FAFC', marginBottom: '8px' }}>Forgot Password</h3>
                          <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '24px' }}>Enter your email to receive a reset code</p>
                          <div className="auth-input-group">
                            <label className="auth-float-label">Email Address</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                          </div>
                          <button className="auth-submit-btn" onClick={() => handleSendOTP('forgot-password')} disabled={isLoading}>
                            {isLoading ? 'Sending...' : 'Send Reset Code'}
                          </button>
                        </div>
                      )}
                      {forgotStep === 2 && (
                        <div className="auth-form-step">
                          <h3 style={{ color: '#F8FAFC', marginBottom: '8px' }}>Verify Code</h3>
                          <p style={{ color: '#94A3B8', fontSize: '14px' }}>
                            We sent a code to <span style={{ color: '#C084FC' }}>{maskEmail(email)}</span>
                          </p>
                          <OTPInput onComplete={handleVerifyForgot} error={otpError} success={otpSuccess} />
                          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <span style={{ color: timer < 60 ? '#F87171' : '#6B7280', fontSize: '14px' }}>
                              {timer > 0 ? `Code expires in ${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}` : 'Code expired'}
                            </span>
                          </div>
                          <button className="auth-resend-btn" onClick={() => handleSendOTP('forgot-password')} disabled={timer > 540 || isLoading} style={{ color: timer > 540 ? '#4B5563' : '#C084FC', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                            {timer > 540 ? `Resend code in ${timer - 540}s` : 'Resend OTP'}
                          </button>
                        </div>
                      )}
                      {forgotStep === 3 && (
                        <form onSubmit={handleResetPassword} className="auth-form-step">
                          <h3 style={{ color: '#F8FAFC', marginBottom: '16px' }}>Set New Password</h3>
                          <div className="auth-input-group" style={{ position: 'relative' }}>
                            <label className="auth-float-label">New Password</label>
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              style={{
                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: showPassword ? '#C084FC' : '#6B7280', display: 'flex', marginTop: '8px'
                              }}
                            >
                              {showPassword ? <EyeOpen /> : <EyeClosed />}
                            </button>
                          </div>
                          <div className="auth-input-group" style={{ position: 'relative' }}>
                            <label className="auth-float-label">Confirm New Password</label>
                            <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              style={{
                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: showConfirmPassword ? '#C084FC' : '#6B7280', display: 'flex', marginTop: '8px'
                              }}
                            >
                              {showConfirmPassword ? <EyeOpen /> : <EyeClosed />}
                            </button>
                          </div>
                          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                            {isLoading ? 'Resetting...' : 'Update Password'}
                          </button>
                        </form>
                      )}
                      <button onClick={() => setForgotStep(0)} style={{ marginTop: '16px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                        ← Back to Login
                      </button>
                    </motion.div>
                  ) : loginStep === 1 ? (
                    <motion.div
                      key="login-s1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      {loginMode === 'otp' ? (
                        <>
                          <div className="auth-input-group field-stagger-1">
                            <label className="auth-float-label">Email Address</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                          </div>
                          <button className="auth-submit-btn field-stagger-2" onClick={() => handleSendOTP('login')} disabled={isLoading}>
                            {isLoading ? 'Sending...' : 'Send Login Code'}
                          </button>
                          <div style={{ textAlign: 'center', marginTop: '16px' }}>
                            <button onClick={() => setLoginMode('password')} style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                              Use password instead
                            </button>
                          </div>
                        </>
                      ) : (
                        <form onSubmit={handleLogin}>
                          <div className="auth-input-group">
                            <label className="auth-float-label">Email Address</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                          </div>
                          <div className="auth-input-group" style={{ position: 'relative' }}>
                            <label className="auth-float-label">Password</label>
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              style={{
                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: showPassword ? '#C084FC' : '#6B7280', display: 'flex', marginTop: '8px'
                              }}
                            >
                              {showPassword ? <EyeOpen /> : <EyeClosed />}
                            </button>
                          </div>
                          <div className="auth-forgot">
                            <button type="button" onClick={() => setForgotStep(1)}>Forgot Password?</button>
                          </div>
                          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                            {isLoading ? 'Signing in...' : 'Sign In'}
                          </button>
                          <div style={{ textAlign: 'center', marginTop: '16px' }}>
                            <button type="button" onClick={() => setLoginMode('otp')} style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                              Use OTP instead
                            </button>
                          </div>
                        </form>
                      )}
                      <p className="auth-bottom-link field-stagger-5">
                        Don't have an account?{' '}
                        <button type="button" onClick={() => switchTab('register')}>Register Now</button>
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="login-otp"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      style={{ textAlign: 'center' }}
                    >
                      <h3 style={{ color: '#F8FAFC', marginBottom: '8px' }}>Security Code</h3>
                      <p style={{ color: '#94A3B8', fontSize: '14px' }}>
                        Enter the code sent to <span style={{ color: '#C084FC' }}>{maskEmail(email)}</span>
                      </p>
                      <OTPInput onComplete={handleVerifyLogin} error={otpError} success={otpSuccess} />
                      <div className="auth-timer" style={{ marginBottom: '24px' }}>
                        <span style={{ color: timer < 60 ? '#F87171' : '#6B7280', fontSize: '14px' }}>
                          {timer > 0 ? `Code expires in ${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}` : 'Code expired'}
                        </span>
                      </div>
                      <button className="auth-submit-btn" onClick={() => handleVerifyLogin(otpCode)} disabled={isLoading || otpCode.length < 6}>
                        {isLoading ? 'Verifying...' : 'Sign In'}
                      </button>
                      <button className="auth-resend-btn" onClick={() => handleSendOTP('login')} disabled={timer > 540 || isLoading} style={{ marginTop: '20px', color: timer > 540 ? '#4B5563' : '#C084FC', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                        {timer > 540 ? `Resend code in ${timer - 540}s` : 'Resend OTP'}
                      </button>
                      <br/>
                      <button onClick={() => setLoginStep(1)} style={{ marginTop: '16px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                        ← Edit Email
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="auth-form-v2">
                <AnimatePresence mode="wait">
                  {regStep === 1 ? (
                    <motion.div
                      key="reg-s1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="auth-input-group field-stagger-1">
                        <label className="auth-float-label">Username</label>
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        {fieldErrors.username && <span className="auth-field-error">{fieldErrors.username}</span>}
                      </div>
                      <div className="auth-input-group field-stagger-2">
                        <label className="auth-float-label">Email Address</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
                      </div>
                      <div className="auth-input-group field-stagger-3" style={{ position: 'relative' }}>
                        <label className="auth-float-label">Password</label>
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: showPassword ? '#C084FC' : '#6B7280', display: 'flex', marginTop: '8px'
                          }}
                        >
                          {showPassword ? <EyeOpen /> : <EyeClosed />}
                        </button>
                        {fieldErrors.password && <span className="auth-field-error">{fieldErrors.password}</span>}
                      </div>
                      <div className="auth-input-group field-stagger-4" style={{ position: 'relative' }}>
                        <label className="auth-float-label">Confirm Password</label>
                        <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={{
                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: showConfirmPassword ? '#C084FC' : '#6B7280', display: 'flex', marginTop: '8px'
                          }}
                        >
                          {showConfirmPassword ? <EyeOpen /> : <EyeClosed />}
                        </button>
                        {fieldErrors.confirmPassword && <span className="auth-field-error">{fieldErrors.confirmPassword}</span>}
                      </div>
                      <button className="auth-submit-btn field-stagger-5" onClick={() => handleSendOTP('register')} disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send OTP'}
                      </button>
                      <p className="auth-bottom-link field-stagger-6">
                        Already have an account? <button type="button" onClick={() => switchTab('login')}>Sign In</button>
                      </p>
                    </motion.div>
                  ) : regStep === 2 ? (
                    <motion.div
                      key="reg-otp"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      style={{ textAlign: 'center' }}
                    >
                      <div className="step-indicator" style={{ color: '#C084FC', fontWeight: 'bold', marginBottom: '12px' }}>Step 2 of 2</div>
                      <h3 style={{ color: '#F8FAFC', marginBottom: '8px' }}>Verify Your Email</h3>
                      <p style={{ color: '#94A3B8', fontSize: '14px' }}>
                        We sent a code to <span style={{ color: '#C084FC' }}>{maskEmail(email)}</span>
                      </p>
                      <OTPInput onComplete={handleVerifyRegister} error={otpError} success={otpSuccess} />
                      <div className="auth-timer" style={{ marginBottom: '24px' }}>
                        <span style={{ color: timer < 60 ? '#F87171' : '#6B7280', fontSize: '14px' }}>
                          {timer > 0 ? `Code expires in ${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}` : 'Code expired'}
                        </span>
                      </div>
                      <button className="auth-submit-btn" onClick={() => handleVerifyRegister(otpCode)} disabled={isLoading || otpCode.length < 6}>
                        {isLoading ? 'Verifying...' : 'Create Account'}
                      </button>
                      <button className="auth-resend-btn" onClick={() => handleSendOTP('register')} disabled={timer > 540 || isLoading} style={{ marginTop: '20px', color: timer > 540 ? '#4B5563' : '#C084FC', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
                        {timer > 540 ? `Resend code in ${timer - 540}s` : 'Resend OTP'}
                      </button>
                      <br/>
                      <button onClick={() => setRegStep(1)} style={{ marginTop: '16px', color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                        ← Back to Edit Info
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="reg-success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{ textAlign: 'center', padding: '20px' }}
                    >
                      <div className="success-checkmark" style={{ marginBottom: '24px' }}>
                        <svg width="80" height="80" viewBox="0 0 80 80">
                          <circle className="check-circle" cx="40" cy="40" r="38" fill="none" stroke="#10b981" strokeWidth="4" />
                          <path className="check-mark" d="M25 40l10 10 20-20" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <h2 style={{ color: '#F8FAFC', marginBottom: '8px' }}>Welcome!</h2>
                      <p style={{ color: '#94A3B8' }}>Your account is ready. Redirecting...</p>
                      <div className="auth-progress-bar" style={{ marginTop: '24px', height: '4px', background: '#1A1A1A', borderRadius: '2px', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2 }} style={{ height: '100%', background: '#10b981' }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
