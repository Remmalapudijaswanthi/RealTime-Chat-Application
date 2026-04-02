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
      className={`toggle-switch ${value ? 'active' : ''}`}
    >
      <motion.div
        layout initial={false} animate={{ x: value ? 20 : 2 }}
        className="toggle-knob"
      />
    </button>
  );

  const SettingsRow = ({ icon, label, sub, onClick, trailing }) => (
    <button
      onClick={onClick}
      className="settings-row-btn"
    >
      {icon && (
        <div className="settings-row-icon">
          {icon}
        </div>
      )}
      <div className="settings-row-content">
        <div className="settings-row-label">{label}</div>
        {sub && <div className="settings-row-sub">{sub}</div>}
      </div>
      {trailing || (onClick && <span className="settings-row-arrow">›</span>)}
    </button>
  );

  // ========== RENDER PAGES ==========

  const renderProfileContent = () => (
    <motion.div key="profile" initial={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
      <div className="profile-info-header">
        <div className="profile-name-edit">
          {isEditingName ? (
            <div className="profile-name-input-wrapper">
              <input autoFocus type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="profile-input profile-name-input" />
              <button onClick={() => handleUpdateProfile({ username })} className="profile-save-btn">✓</button>
            </div>
          ) : (
            <>
              <h2 className="profile-display-name">{user.username}</h2>
              <div title="Username cannot be changed" className="profile-lock-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
            </>
          )}
        </div>
        <div className="profile-handle-row">
          <span className="profile-handle">@{user.username}</span>
        </div>
        <div className="profile-status-wrapper">
          <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} className="profile-status-btn">
            <span className="status-indicator" style={{ background: statusOptions.find(o => o.val === user.status)?.color || '#22C55E' }} />
            {user.status || 'Online'}
          </button>
          <AnimatePresence>
            {showStatusDropdown && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="profile-status-dropdown">
                {statusOptions.map(opt => (
                  <button key={opt.val} onClick={() => handleStatusChange(opt.val)} className="status-option-btn">
                    <span className="status-indicator-small" style={{ background: opt.color }} />{opt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="profile-about-section">
        <label className="profile-section-label">About</label>
        {isEditingBio ? (
          <div className="profile-bio-edit-wrapper">
            <textarea autoFocus value={bio} onChange={(e) => setBio(e.target.value.substring(0, 100))}
              className="profile-input profile-bio-input" />
            <div className="profile-bio-footer">
              <span className="bio-char-count">{bio.length}/100</span>
              <div className="bio-actions">
                <button onClick={() => setIsEditingBio(false)} className="bio-cancel-btn">Cancel</button>
                <button onClick={() => handleUpdateProfile({ bio })} className="profile-save-btn">Save</button>
              </div>
            </div>
          </div>
        ) : (
          <div onClick={() => setIsEditingBio(true)} className="profile-bio-display">
            {bio || '+ Add bio'}
          </div>
        )}
      </div>

      <div className="profile-menu-list">
        <SettingsRow icon="🎨" label="Appearance" sub="Themes, wallpaper, dark/light" onClick={() => setActivePage('appearance')} />
        <SettingsRow icon="🔒" label="Privacy" sub="Last seen, online status, message seen" onClick={() => setActivePage('privacy')} />
        <SettingsRow icon="🔑" label="Account" sub="Change password, email" onClick={() => setActivePage('account')} />
      </div>

      <button onClick={logout} className="profile-logout-btn">
        🚪 Logout
      </button>
    </motion.div>
  );

  // ========== APPEARANCE PAGE ==========
  const renderAppearancePage = () => (
    <motion.div key="appearance" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.2 }}>
      <div className="profile-submenu-header">
        <button onClick={() => setActivePage('profile')} className="back-arrow-btn">←</button>
        <span className="submenu-icon">🎨</span>
        <h3 className="submenu-title">Appearance</h3>
      </div>

      <SettingsRow icon="🌓" label="Color Mode" sub={isLightMode ? 'Light mode' : 'Dark mode'}
        trailing={<Toggle value={isLightMode} onChange={toggleTheme} />} />
      <SettingsRow icon="🖼️" label="Chat Wallpaper" sub="Change chat background" onClick={() => setShowWallpaperPicker(true)} />
    </motion.div>
  );

  // ========== PRIVACY PAGE ==========
  const renderPrivacyPage = () => (
    <motion.div key="privacy" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} transition={{ duration: 0.2 }}>
      <div className="profile-submenu-header">
        <button onClick={() => setActivePage('profile')} className="back-arrow-btn">←</button>
        <span className="submenu-icon">🔒</span>
        <h3 className="submenu-title">Privacy</h3>
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
      <div className="profile-lock-section">
        <label className="profile-section-label">Chat Lock</label>
        {user?.settings?.chatLockPin ? (
          <>
            <SettingsRow icon="🔐" label="Change PIN" sub="Update your 4-digit chat lock PIN" onClick={() => { setLockMode('setup'); setShowLockSetup(true); }} />
            <button onClick={handleRemovePin} className="remove-pin-btn">
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
      <div className="profile-submenu-header">
        <button onClick={() => setActivePage('profile')} className="back-arrow-btn">←</button>
        <span className="submenu-icon">🔑</span>
        <h3 className="submenu-title">Account</h3>
      </div>

      <div className="account-security-section">
        <h4 className="account-section-title">Security</h4>
        
        {/* Change Password Card */}
        <div className="settings-card">
          <h4 className="card-title">Change Password</h4>
          <div className="card-form">
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="profile-input" />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="profile-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="profile-input" />
            </div>
            {passwordError && <div className="form-error">{passwordError}</div>}
            <button onClick={handleUpdatePassword} disabled={passwordLoading} className="form-submit-btn">
              {passwordLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>

        {/* Reset Password Card */}
        <div className="settings-card">
          <h4 className="card-title">Forgot Password?</h4>
          <div className="card-description">Send a reset link to your email ({maskedEmail})</div>
          <button onClick={handleSendResetLink} className="card-action-btn">
            {resetEmailSent ? 'Link Sent • Check Email' : 'Send Reset Link'}
          </button>
        </div>
      </div>

      <div className="account-info-section">
        <h4 className="account-section-title">Account Info</h4>
        <div className="info-list-card">
          <div className="info-list-item">
            <span className="info-label">Email Address</span>
            <span className="info-value">{maskedEmail}</span>
          </div>
          <div className="info-list-item">
            <span className="info-label">Username</span>
            <span className="info-value">@{user.username} <span className="info-hint">(cannot change)</span></span>
          </div>
          <div className="info-list-item no-border">
            <span className="info-label">Member Since</span>
            <span className="info-value">{new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose}>
          <motion.div
            className="modal-content profile-modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="profile-header-banner">
              <button onClick={onClose} className="profile-close-btn">✕</button>
              <div className="profile-avatar-wrapper">
                <div
                  className="profile-avatar-container"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {/* Profile photo or initials */}
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      className="profile-avatar-img"
                    />
                  ) : (
                    <div className="profile-avatar-initials">
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                  )}

                  {/* Camera overlay — ALWAYS visible */}
                  <div className="profile-camera-icon">
                    <svg
                      width="14" height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>

                  {/* Hover overlay for desktop */}
                  <div className="photo-hover-overlay">
                    <span className="photo-change-text">Change</span>
                  </div>
                </div>

                <p className="avatar-change-hint" onClick={() => fileInputRef.current?.click()}>
                  Tap to change photo
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            <div className="profile-body">
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
              setUser(prev => ({ ...prev, settings: { ...prev.settings, chatLockPin: pin } }));
            }}
            onClose={() => setShowLockSetup(false)}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
