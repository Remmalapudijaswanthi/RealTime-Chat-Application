import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';

const THEMES = [
  { id: 'dark-nebula', label: 'Dark Nebula', color: '#7c3aed' },
  { id: 'midnight',    label: 'Midnight',    color: '#22c55e' },
  { id: 'ocean',       label: 'Ocean',       color: '#06b6d4' },
  { id: 'neon-pink',   label: 'Neon Pink',   color: '#ec4899' },
  { id: 'forest',      label: 'Forest',      color: '#10b981' },
  { id: 'sunset',      label: 'Sunset',      color: '#f97316' },
];

export default function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const savedTheme = () => localStorage.getItem('pingme-theme') || 'dark-nebula';
  const [activeTheme, setActiveTheme] = useState(savedTheme);

  const [settings, setSettings] = useState({
    showLastSeen:      user?.settings?.showLastSeen      ?? true,
    showOnlineStatus:  user?.settings?.showOnlineStatus  ?? true,
    readReceipts:      user?.settings?.readReceipts      ?? true,
    notifications:     user?.settings?.notifications     ?? true,
  });

  const [oldPass, setOldPass]     = useState('');
  const [newPass, setNewPass]     = useState('');
  const [confPass, setConfPass]   = useState('');
  const [passMsg, setPassMsg]     = useState('');
  const [passErr, setPassErr]     = useState('');
  const [savingPass, setSavingPass] = useState(false);

  const applyTheme = (id) => {
    setActiveTheme(id);
    document.body.setAttribute('data-theme', id === 'dark-nebula' ? '' : id);
    localStorage.setItem('pingme-theme', id);
    axiosInstance.patch('/api/users/settings', { theme: id }).then((res) => {
      if (res.data?.user) setUser(res.data.user);
    }).catch(() => {});
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

        {/* === THEMES === */}
        <section className="settings-section">
          <h2 className="settings-section-title">Chat Theme</h2>
          <div className="theme-grid">
            {THEMES.map((t) => (
              <motion.button
                key={t.id}
                className={`theme-swatch ${activeTheme === t.id ? 'active' : ''}`}
                style={{ '--swatch-color': t.color }}
                onClick={() => applyTheme(t.id)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.96 }}
              >
                <div className="swatch-dot" style={{ background: t.color }} />
                <span>{t.label}</span>
                {activeTheme === t.id && (
                  <svg className="swatch-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </motion.button>
            ))}
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
              <input type="password" value={oldPass} onChange={(e) => setOldPass(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" value={confPass} onChange={(e) => setConfPass(e.target.value)} placeholder="••••••••" />
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
