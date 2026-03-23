import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';

const WALLPAPERS = [
  {
    id: 'default',
    label: 'Default',
    type: 'color',
    value: '',
    preview: 'var(--bg-primary)'
  },
  {
    id: 'dark-purple',
    label: 'Dark Purple',
    type: 'gradient',
    value: 'linear-gradient(160deg, #1a0533 0%, #0d0d0d 100%)'
  },
  {
    id: 'ocean',
    label: 'Ocean',
    type: 'gradient',
    value: 'linear-gradient(160deg, #012030 0%, #060b18 100%)'
  },
  {
    id: 'dots',
    label: 'Dots',
    type: 'pattern',
    bgColor: '#0D0D0D',
    bgImage: 'radial-gradient(circle, #2A2A2A 1.5px, transparent 1.5px)',
    bgSize: '20px 20px'
  },
  {
    id: 'grid',
    label: 'Grid',
    type: 'pattern',
    bgColor: '#0D0D0D',
    bgImage: 'linear-gradient(#1A1A2E 1px, transparent 1px), linear-gradient(90deg, #1A1A2E 1px, transparent 1px)',
    bgSize: '25px 25px'
  }
];

export default function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    showLastSeen:      user?.settings?.showLastSeen      ?? true,
    showOnlineStatus:  user?.settings?.showOnlineStatus  ?? true,
    readReceipts:      user?.settings?.readReceipts      ?? true,
    notifications:     user?.settings?.notifications     ?? true,
  });

  const [oldPass, setOldPass]     = useState('');
  const [newPass, setNewPass]     = useState('');
  const [confPass, setConfPass]   = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfPass, setShowConfPass] = useState(false);
  const [passMsg, setPassMsg]     = useState('');
  const [passErr, setPassErr]     = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [selectedWallpaper, setSelectedWallpaper] = useState(() => {
    try {
      const saved = localStorage.getItem('pingme_wallpaper');
      return saved ? JSON.parse(saved) : WALLPAPERS[0];
    } catch(e) { return WALLPAPERS[0]; }
  });

  const applyWallpaper = (wp) => {
    const el = document.getElementById('pingme-chat-area');
    if (!el) return;
    
    el.style.cssText = '';
    
    if (!wp || wp.id === 'default') {
      localStorage.removeItem('pingme_wallpaper');
      // Save to server too
      axiosInstance.patch('/api/users/settings', { chatWallpaper: 'default' });
      return;
    }
    
    if (wp.type === 'color') {
      el.style.backgroundColor = wp.value;
    } else if (wp.type === 'gradient') {
      el.style.background = wp.value;
    } else if (wp.type === 'pattern') {
      el.style.backgroundColor = wp.bgColor;
      el.style.backgroundImage = wp.bgImage;
      el.style.backgroundSize = wp.bgSize;
      el.style.backgroundRepeat = 'repeat';
    }
    
    localStorage.setItem('pingme_wallpaper', JSON.stringify(wp));
    
    // Save to server
    axiosInstance.patch('/api/users/settings', { 
      chatWallpaper: wp.id 
    }).catch(console.error);

    window.dispatchEvent(
      new CustomEvent('pingme:wallpaper', {
        detail: wp
      })
    );
  };

  const handleToggle = async (key) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    try {
      const res = await axiosInstance.patch('/api/users/settings', updated);
      if (res.data?.user) setUser(res.data.user);
    } catch {}
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMsg(''); setPassErr('');
    if (newPass !== confPass) { setPassErr('Passwords do not match'); return; }
    if (newPass.length < 6)   { setPassErr('Password must be at least 6 characters'); return; }
    try {
      setSavingPass(true);
      await axiosInstance.post('/api/users/change-password', { oldPassword: oldPass, newPassword: newPass });
      setPassMsg('Password changed successfully!');
      setOldPass(''); setNewPass(''); setConfPass('');
    } catch (err) {
      setPassErr(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="settings-page">
      <motion.div
        className="settings-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <button className="profile-back-btn" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <h1 className="profile-title">Settings</h1>

        {/* === WALLPAPERS === */}
        <section className="settings-section">
          <h2 className="settings-section-title">Chat Wallpaper</h2>
          <div className="wallpaper-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {WALLPAPERS.map((wp) => (
              <motion.div
                key={wp.id}
                onClick={() => setSelectedWallpaper(wp)}
                style={{
                  width: '100%',
                  height: '80px',
                  borderRadius: '12px',
                  background: wp.type === 'color' ? wp.value || 'var(--bg-primary)' : 
                             wp.type === 'gradient' ? wp.value : 
                             wp.bgColor,
                  backgroundImage: wp.type === 'pattern' ? wp.bgImage : 'none',
                  backgroundSize: wp.type === 'pattern' ? wp.bgSize : 'auto',
                  border: selectedWallpaper.id === wp.id ? '2px solid #C084FC' : '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                whileHover={{ scale: 1.01 }}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.2)',
                  zIndex: 0
                }} />
                <span style={{ 
                  color: 'white', 
                  fontWeight: '600', 
                  zIndex: 1,
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}>{wp.label}</span>
                
                <div style={{ zIndex: 1, display: 'flex', alignItems: 'center' }}>
                  {selectedWallpaper.id === wp.id ? (
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      background: '#C084FC', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  ) : (
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      border: '2px solid rgba(255,255,255,0.5)' 
                    }} />
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <motion.button 
              className="auth-btn" 
              style={{ flex: 1, margin: 0 }}
              onClick={() => applyWallpaper(selectedWallpaper)}
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }}
            >
              Apply Wallpaper
            </motion.button>
            <motion.button 
              className="auth-btn" 
              style={{ flex: 1, margin: 0, background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              onClick={() => {
                setSelectedWallpaper(WALLPAPERS[0]);
                applyWallpaper(WALLPAPERS[0]);
              }}
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }}
            >
              Reset
            </motion.button>
          </div>
        </section>

        {/* === PRIVACY === */}
        <section className="settings-section">
          <h2 className="settings-section-title">Privacy</h2>
          {[
            { key: 'showLastSeen',     label: 'Show Last Seen',     desc: 'Let others see when you were last active' },
            { key: 'showOnlineStatus', label: 'Show Online Status',  desc: 'Let others see when you\'re online' },
            { key: 'readReceipts',     label: 'Read Receipts',       desc: 'Show when you\'ve read messages' },
            { key: 'notifications',    label: 'Notifications',       desc: 'Receive message notifications' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="toggle-row">
              <div className="toggle-info">
                <span className="toggle-label">{label}</span>
                <span className="toggle-desc">{desc}</span>
              </div>
              <motion.button
                className={`toggle-switch ${settings[key] ? 'on' : 'off'}`}
                onClick={() => handleToggle(key)}
                whileTap={{ scale: 0.95 }}
              >
                <motion.div className="toggle-knob" layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
              </motion.button>
            </div>
          ))}
        </section>

        {/* === CHANGE PASSWORD === */}
        <section className="settings-section">
          <h2 className="settings-section-title">Change Password</h2>
          <form className="profile-form" onSubmit={handleChangePassword}>
            {passMsg && <div className="profile-success">{passMsg}</div>}
            {passErr && <div className="profile-error">{passErr}</div>}
            
            <div className="form-group">
              <label>Current Password</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type={showOldPass ? 'text' : 'password'} 
                  value={oldPass} 
                  onChange={(e) => setOldPass(e.target.value)} 
                  placeholder="••••••••" 
                  style={{ width: '100%', paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: showOldPass ? '#C084FC' : '#6B7280', display: 'flex'
                  }}
                >
                  {showOldPass ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>New Password</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type={showNewPass ? 'text' : 'password'} 
                  value={newPass} 
                  onChange={(e) => setNewPass(e.target.value)} 
                  placeholder="••••••••" 
                  style={{ width: '100%', paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: showNewPass ? '#C084FC' : '#6B7280', display: 'flex'
                  }}
                >
                  {showNewPass ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <div style={{ position: 'relative', width: '100%' }}>
                <input 
                  type={showConfPass ? 'text' : 'password'} 
                  value={confPass} 
                  onChange={(e) => setConfPass(e.target.value)} 
                  placeholder="••••••••" 
                  style={{ width: '100%', paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfPass(!showConfPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: showConfPass ? '#C084FC' : '#6B7280', display: 'flex'
                  }}
                >
                  {showConfPass ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <motion.button className="auth-btn" type="submit" disabled={savingPass} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              {savingPass ? 'Changing…' : 'Change Password'}
            </motion.button>
          </form>
        </section>

        {/* === LOGOUT === */}
        <section className="settings-section">
          <motion.button
            className="logout-full-btn"
            onClick={logout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log Out
          </motion.button>
        </section>
      </motion.div>
    </div>
  );
}
