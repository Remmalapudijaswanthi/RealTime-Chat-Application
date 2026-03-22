import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';
import Logo from './Logo';
import WallpaperModal from './WallpaperModal';
import ChatLockModal from './ChatLockModal';

export default function MyProfileModal({ isOpen, onClose }) {
  const { user, setUser, logout } = useAuth();
  const [activePage, setActivePage] = useState('profile');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const fileInputRef = useRef(null);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Profile settings sub-states
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [showLockSetup, setShowLockSetup] = useState(false);
  const [lockMode, setLockMode] = useState('setup');
  const [isLightMode, setIsLightMode] = useState(() => document.documentElement.classList.contains('light-mode'));

  // Privacy toggle states (from user settings)
  const [privacySettings, setPrivacySettings] = useState({
    showLastSeen: user?.settings?.showLastSeen ?? true,
    showOnlineStatus: user?.settings?.showOnlineStatus ?? true,
    readReceipts: user?.settings?.readReceipts ?? true,
    notifications: user?.settings?.notifications ?? true,
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleThemeChange = () => setIsLightMode(document.documentElement.classList.contains('light-mode'));
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const isLight = root.classList.toggle('light-mode');
    setIsLightMode(isLight);
    localStorage.setItem('pingme-color-mode', isLight ? 'light' : 'dark');
    window.dispatchEvent(new Event('themeChange'));
  };

  const handleUpdateProfile = async (updates) => {
    try {
      setLoading(true);
      const res = await axiosInstance.put('/api/users/profile', updates);
      setUser(res.data);
      setIsEditingName(false);
      setIsEditingBio(false);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await axiosInstance.patch('/api/users/status', { status: newStatus });
      setUser(res.data);
      setShowStatusDropdown(false);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 400;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
        else { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        handleUpdateProfile({ avatar: canvas.toDataURL('image/jpeg', 0.7) });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const togglePrivacySetting = async (key) => {
    const newVal = !privacySettings[key];
    setPrivacySettings(prev => ({ ...prev, [key]: newVal }));
    try {
      await axiosInstance.patch('/api/users/settings', { settings: { [key]: newVal } });
      setUser(prev => ({ ...prev, settings: { ...prev.settings, [key]: newVal } }));
    } catch (err) {
      setPrivacySettings(prev => ({ ...prev, [key]: !newVal }));
      console.error('Toggle setting error:', err);
    }
  };

  const handleRemovePin = async () => {
    if (!window.confirm('This will remove your PIN and unlock ALL locked chats. Continue?')) return;
    try {
      await axiosInstance.delete('/api/users/chat-lock/pin');
      setUser(prev => ({ ...prev, settings: { ...prev.settings, chatLockPin: null, lockedChats: [] } }));
      alert('PIN removed and all chats unlocked.');
    } catch (err) {
      console.error('Remove PIN error:', err);
      alert('Failed to remove PIN');
    }
  };

  const statusOptions = [
    { label: 'Online', val: 'Online', color: '#22C55E' },
    { label: 'Away', val: 'Away', color: '#EAB308' },
    { label: 'Busy', val: 'Busy', color: '#EF4444' },
    { label: 'Invisible', val: 'Invisible', color: '#94A3B8' },
  ];

  if (!user) return null;

  const bgColor = isLightMode ? '#FAF5EB' : 'var(--bg-secondary, #1A1A1A)';
  const borderColor = isLightMode ? '#E8D5B0' : 'var(--border, #2A2A2A)';
  const surfaceColor = isLightMode ? '#F5EDD8' : 'var(--bg-surface, #111111)';
  const textColor = isLightMode ? '#2C1810' : 'var(--text-primary, #F8FAFC)';
  const textMuted = isLightMode ? '#A0856A' : 'var(--text-muted, #6B7280)';
  const textSecondary = isLightMode ? '#6B4C35' : 'var(--text-secondary, #94A3B8)';
  
  const maskedEmail = user.email ? `${user.email.substring(0,2)}***@${user.email.split('@')[1]}` : 'Not set';

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields required'); return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password min 8 characters'); return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match"); return;
    }
    setPasswordError('');
    setPasswordLoading(true);
    try {
      await axiosInstance.post('/api/users/change-password', { currentPassword, newPassword });
      alert('Password updated successfully');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSendResetLink = async () => {
    try {
      await axiosInstance.post('/api/auth/forgot-password/send', { email: user.email });
      setResetEmailSent(true);
    } catch (err) {
      alert('Failed to send reset link');
    }
  };

  const Toggle = ({ value, onChange }) => (
    <button
      onClick={onChange}
      style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: value ? '#22C55E' : '#334155',
        position: 'relative', cursor: 'pointer', border: 'none',
        transition: 'background 0.3s', flexShrink: 0
      }}
    >
      <motion.div
        layout initial={false} animate={{ x: value ? 20 : 2 }}
        style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#FFF', position: 'absolute', top: '2px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
      />
    </button>
  );

  const SettingsRow = ({ icon, label, sub, onClick, trailing }) => (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', background: surfaceColor, border: 'none', borderBottom: `1px solid ${borderColor}`, cursor: onClick ? 'pointer' : 'default', textAlign: 'left', width: '100%', transition: 'background 0.2s' }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = isLightMode ? '#EDD9B5' : 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.background = surfaceColor }}
    >
      {icon && (
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isLightMode ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.15)', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: textColor }}>{label}</div>
        {sub && <div style={{ fontSize: '12px', color: textSecondary, marginTop: '2px' }}>{sub}</div>}
      </div>
      {trailing || (onClick && <span style={{ color: textMuted, fontSize: '16px', fontWeight: 'bold' }}>›</span>)}
    </button>
  );

  // ========== RENDER PAGES ==========

  const renderProfileContent = () => (
    <motion.div key="profile" initial={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {isEditingName ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input autoFocus type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                style={{ background: surfaceColor, border: '1.5px solid var(--accent)', borderRadius: '8px', padding: '6px 12px', color: textColor, fontSize: '18px', textAlign: 'center' }} />
              <button onClick={() => handleUpdateProfile({ username })} style={{ color: '#22C55E', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✓</button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: textColor }}>{user.username}</h2>
              <div title="Username cannot be changed" style={{ background: surfaceColor, padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: textMuted }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '6px' }}>
          <span style={{ color: 'var(--accent)', fontSize: '14px', fontWeight: '500' }}>@{user.username}</span>
        </div>
        <div style={{ position: 'relative', marginTop: '16px', display: 'inline-block' }}>
          <button onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            style={{ background: surfaceColor, border: `1px solid ${borderColor}`, borderRadius: '20px', padding: '6px 16px', color: textColor, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusOptions.find(o => o.val === user.status)?.color || '#22C55E' }} />
            {user.status || 'Online'}
          </button>
          <AnimatePresence>
            {showStatusDropdown && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px', background: bgColor, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '6px', width: '140px', zIndex: 20, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                {statusOptions.map(opt => (
                  <button key={opt.val} onClick={() => handleStatusChange(opt.val)}
                    style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', borderRadius: '8px', color: textColor, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', textAlign: 'left' }} 
                    onMouseEnter={e => e.currentTarget.style.background = surfaceColor}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color }} />{opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: textMuted, marginBottom: '8px', letterSpacing: '0.05em' }}>About</label>
        {isEditingBio ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea autoFocus value={bio} onChange={(e) => setBio(e.target.value.substring(0, 100))}
              style={{ background: surfaceColor, border: '1.5px solid var(--accent)', borderRadius: '12px', padding: '12px', color: textColor, fontSize: '14px', minHeight: '80px', resize: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: textMuted }}>{bio.length}/100</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setIsEditingBio(false)} style={{ fontSize: '13px', background: 'none', border: 'none', color: textMuted, cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => handleUpdateProfile({ bio })} style={{ fontSize: '13px', background: 'none', border: 'none', color: 'var(--accent)', fontWeight: '600', cursor: 'pointer' }}>Save</button>
              </div>
            </div>
          </div>
        ) : (
          <div onClick={() => setIsEditingBio(true)} style={{ fontSize: '15px', color: bio ? textColor : 'var(--accent)', cursor: 'pointer' }}>
            {bio || '+ Add bio'}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '14px', overflow: 'hidden', border: `1px solid ${borderColor}` }}>
        <SettingsRow icon="🎨" label="Appearance" sub="Themes, wallpaper, dark/light" onClick={() => setActivePage('appearance')} />
        <SettingsRow icon="🔒" label="Privacy" sub="Last seen, online status, message seen" onClick={() => setActivePage('privacy')} />
        <SettingsRow icon="🔑" label="Account" sub="Change password, email" onClick={() => setActivePage('account')} trailing={<span style={{ color: textMuted, fontSize: '16px', fontWeight: 'bold' }}>›</span>} />
      </div>

      <button onClick={logout}
        style={{ marginTop: '24px', width: '100%', padding: '16px', background: 'none', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', color: '#EF4444', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'background 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        🚪 Logout
      </button>
    </motion.div>
  );

  // ========== APPEARANCE PAGE ==========
  const renderAppearancePage = () => (
    <motion.div key="appearance" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={() => setActivePage('profile')} style={{ background: 'none', border: 'none', color: textColor, cursor: 'pointer', fontSize: '20px' }}>←</button>
        <span style={{ fontSize: '20px' }}>🎨</span>
        <h3 style={{ margin: 0, fontSize: '18px', color: textColor }}>Appearance</h3>
      </div>

      <SettingsRow icon="🌓" label="Color Mode" sub={isLightMode ? 'Light mode' : 'Dark mode'}
        trailing={<Toggle value={isLightMode} onChange={toggleTheme} />} />
      <SettingsRow icon="🖼️" label="Chat Wallpaper" sub="Change chat background" onClick={() => setShowWallpaperPicker(true)} />
    </motion.div>
  );

  // ========== PRIVACY PAGE ==========
  const renderPrivacyPage = () => (
    <motion.div key="privacy" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={() => setActivePage('profile')} style={{ background: 'none', border: 'none', color: textColor, cursor: 'pointer', fontSize: '20px' }}>←</button>
        <span style={{ fontSize: '20px' }}>🔒</span>
        <h3 style={{ margin: 0, fontSize: '18px', color: textColor }}>Privacy</h3>
      </div>

      <SettingsRow icon="⏰" label="Show My Last Active Time" sub="Let others see when you were last active"
        trailing={<Toggle value={privacySettings.showLastSeen} onChange={() => togglePrivacySetting('showLastSeen')} />} />
      <SettingsRow icon="🟢" label="Show When I'm Online" sub="Let others see your online status"
        trailing={<Toggle value={privacySettings.showOnlineStatus} onChange={() => togglePrivacySetting('showOnlineStatus')} />} />
      <SettingsRow icon="👁️" label="Message Seen Indicator" sub="Show when you have read messages"
        trailing={<Toggle value={privacySettings.readReceipts} onChange={() => togglePrivacySetting('readReceipts')} />} />
      <SettingsRow icon="🔔" label="Message Alerts" sub="Receive notification sounds and badges"
        trailing={<Toggle value={privacySettings.notifications} onChange={() => togglePrivacySetting('notifications')} />} />

      {/* Chat Lock Section */}
      <div style={{ marginTop: '28px' }}>
        <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: '#6B7280', marginBottom: '12px', letterSpacing: '0.05em' }}>Chat Lock</label>
        {user?.settings?.chatLockPin ? (
          <>
            <SettingsRow icon="🔐" label="Change PIN" sub="Update your 4-digit chat lock PIN" onClick={() => { setLockMode('setup'); setShowLockSetup(true); }} />
            <button onClick={handleRemovePin}
              style={{ width: '100%', padding: '12px', marginTop: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#EF4444', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
              🗑️ Remove PIN & Unlock All
            </button>
          </>
        ) : (
          <SettingsRow icon="🔑" label="Set up Chat Lock PIN" sub="Create a 4-digit PIN to lock chats" onClick={() => { setLockMode('setup'); setShowLockSetup(true); }} />
        )}
      </div>
    </motion.div>
  );

  const renderAccountPage = () => (
    <motion.div key="account" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={() => setActivePage('profile')} style={{ background: 'none', border: 'none', color: textColor, cursor: 'pointer', fontSize: '20px' }}>←</button>
        <span style={{ fontSize: '20px' }}>🔑</span>
        <h3 style={{ margin: 0, fontSize: '18px', color: textColor }}>Account</h3>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ color: textMuted, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Security</h4>
        
        {/* Change Password Card */}
        <div style={{ background: surfaceColor, borderRadius: '14px', padding: '16px', marginBottom: '12px', border: `1px solid ${borderColor}` }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: textColor }}>Change Password</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: textMuted, marginBottom: '4px' }}>Current Password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={{ background: bgColor, border: `1px solid ${borderColor}`, padding: '10px 12px', borderRadius: '8px', color: textColor, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: textMuted, marginBottom: '4px' }}>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ background: bgColor, border: `1px solid ${borderColor}`, padding: '10px 12px', borderRadius: '8px', color: textColor, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: textMuted, marginBottom: '4px' }}>Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ background: bgColor, border: `1px solid ${borderColor}`, padding: '10px 12px', borderRadius: '8px', color: textColor, width: '100%', boxSizing: 'border-box' }} />
            </div>
            {passwordError && <div style={{ color: '#EF4444', fontSize: '12px' }}>{passwordError}</div>}
            <button onClick={handleUpdatePassword} disabled={passwordLoading} style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginTop: '4px', transition: 'opacity 0.2s' }}>
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* Reset Password Card */}
        <div style={{ background: surfaceColor, borderRadius: '14px', padding: '16px', border: `1px solid ${borderColor}` }}>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: textColor }}>Forgot Password?</h4>
          <div style={{ color: textMuted, fontSize: '13px', marginBottom: '12px' }}>Send a reset link to your email ({maskedEmail})</div>
          <button onClick={handleSendResetLink} style={{ border: '1px solid #7C3AED', background: 'transparent', color: '#7C3AED', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', width: '100%', transition: 'background 0.2s' }}>
            {resetEmailSent ? 'Link Sent • Check Email' : 'Send Reset Link'}
          </button>
        </div>
      </div>

      <div>
        <h4 style={{ color: textMuted, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', marginTop: '24px' }}>Account Info</h4>
        <div style={{ background: surfaceColor, borderRadius: '14px', padding: '0 16px', border: `1px solid ${borderColor}` }}>
          <div style={{ padding: '16px 0', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: textColor, fontSize: '14px', fontWeight: '500' }}>Email Address</span>
            <span style={{ color: textSecondary, fontSize: '14px' }}>{maskedEmail}</span>
          </div>
          <div style={{ padding: '16px 0', borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: textColor, fontSize: '14px', fontWeight: '500' }}>Username</span>
            <span style={{ color: textSecondary, fontSize: '14px' }}>@{user.username} <span style={{fontSize:'11px',opacity:0.6}}>(cannot change)</span></span>
          </div>
          <div style={{ padding: '16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: textColor, fontSize: '14px', fontWeight: '500' }}>Member Since</span>
            <span style={{ color: textSecondary, fontSize: '14px' }}>{new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', padding: '16px' }}
          onClick={onClose}
        >
          <motion.div
            className="profile-modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', width: '440px', maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', overflowX: 'hidden', background: bgColor, borderRadius: '24px', border: `1px solid ${borderColor}`, boxShadow: '0 32px 80px rgba(0,0,0,0.6)', margin: 'auto', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ height: '140px', background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)', position: 'relative', flexShrink: 0 }}>
              <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', zIndex: 10 }}>✕</button>
              <div style={{ position: 'absolute', bottom: '-40px', left: '50%', transform: 'translateX(-50%)' }}>
                <div className="avatar-edit-wrapper" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                  <img src={user.avatar} alt={user.username} style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid var(--bg-secondary)', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="avatar-hover">
                    <span style={{ fontSize: '24px' }}>📷</span>
                  </div>
                </div>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarChange} />
              </div>
            </div>

            <div style={{ padding: '50px 24px 24px', flex: 1, overflowY: 'auto' }}>
              <AnimatePresence mode="wait">
                {activePage === 'profile' && renderProfileContent()}
                {activePage === 'appearance' && renderAppearancePage()}
                {activePage === 'privacy' && renderPrivacyPage()}
                {activePage === 'account' && renderAccountPage()}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Wallpaper Picker Modal */}
          <WallpaperModal 
            isOpen={showWallpaperPicker}
            onClose={() => setShowWallpaperPicker(false)}
            axiosInstance={axiosInstance}
            user={user}
          />

          {/* Chat Lock Setup Modal */}
          <ChatLockModal
            isOpen={showLockSetup}
            mode={lockMode}
            onVerify={(pin) => {
              setShowLockSetup(false);
              setUser(prev => ({ ...prev, settings: { ...prev.settings, chatLockPin: 'exists' } }));
            }}
            onClose={() => setShowLockSetup(false)}
          />
        </div>
      )}
    </AnimatePresence>
  );
}

