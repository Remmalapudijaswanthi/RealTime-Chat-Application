import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';

const SOLID_COLORS = [
  { id: 'black', bg: '#000000', label: 'Pure Black' },
  { id: 'deep_dark', bg: '#0A0A0A', label: 'Deep Dark' },
  { id: 'dark_navy', bg: '#06090F', label: 'Dark Navy' },
  { id: 'dark_slate', bg: '#080C12', label: 'Dark Slate' },
  { id: 'dark_purple', bg: '#0D0520', label: 'Dark Purple' },
  { id: 'dark_green', bg: '#050F08', label: 'Dark Green' },
  { id: 'dark_brown', bg: '#0F0805', label: 'Dark Brown' },
  { id: 'dark_rose', bg: '#0F0508', label: 'Dark Rose' }
];

const GRADIENTS = [
  { id: 'deep_space', bg: 'radial-gradient(ellipse at top, #1a0533 0%, #0a0a0f 60%)', label: 'Deep Space' },
  { id: 'dark_ocean', bg: 'radial-gradient(ellipse at bottom, #012030 0%, #060b18 60%)', label: 'Dark Ocean' },
  { id: 'cosmic_purple', bg: 'radial-gradient(ellipse at center, #120820 0%, #0a0a0f 70%)', label: 'Cosmic Purple' },
  { id: 'forest_night', bg: 'radial-gradient(ellipse at top left, #012010 0%, #0a0a0f 70%)', label: 'Forest Night' },
  { id: 'rose_night', bg: 'radial-gradient(ellipse at bottom right, #200510 0%, #0a0a0f 70%)', label: 'Rose Night' },
  { id: 'golden_dark', bg: 'radial-gradient(ellipse at top right, #1a1000 0%, #0a0a0a 70%)', label: 'Golden Dark' }
];

const PATTERNS = [
  { id: 'dot_grid', bgColor: '#0D0D0D', bgImage: 'radial-gradient(#2A2A2A 1px, transparent 1px)', bgSize: '24px 24px', label: 'Dot Grid' },
  { id: 'diagonal', bgColor: '#0D0D0D', bgImage: 'repeating-linear-gradient(45deg, #1A1A1A 0px, #1A1A1A 1px, transparent 1px, transparent 10px)', bgSize: 'auto', label: 'Diagonal Lines' },
  { id: 'grid', bgColor: '#0D0D0D', bgImage: 'linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)', bgSize: '30px 30px', label: 'Grid Lines' },
  { id: 'circuit', bgColor: '#0A0A0F', bgImage: 'linear-gradient(#1A1A2E 1px, transparent 1px), linear-gradient(90deg, #1A1A2E 1px, transparent 1px)', bgSize: '40px 40px', label: 'Circuit' }
];

const GRADIENT_DIRS = [
  { id: 'top', icon: '↑', val: 'to top' },
  { id: 'bottom', icon: '↓', val: 'to bottom' },
  { id: 'left', icon: '←', val: 'to left' },
  { id: 'right', icon: '→', val: 'to right' },
  { id: 'tr', icon: '↗', val: 'to top right' },
  { id: 'bl', icon: '↙', val: 'to bottom left' },
  { id: 'tl', icon: '↖', val: 'to top left' },
  { id: 'br', icon: '↘', val: 'to bottom right' },
];

export default function SettingsPanel({ onClose }) {
  const { user, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('appearance');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [status, setStatus] = useState(user?.status || 'Online');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  
  // App Background State
  const defaultAppBg = { type: 'color', bg: '#0A0A0A', id: 'deep_dark' };
  const [appBg, setAppBg] = useState(defaultAppBg);
  
  // Chat Wallpaper State
  const defaultChatWp = { type: 'color', bg: 'transparent', id: 'transparent' };
  const [chatWp, setChatWp] = useState(defaultChatWp);
  
  // Custom Chat Gradient Builder State
  const [customColor, setCustomColor] = useState('#0D0D0D');
  const [gradCol1, setGradCol1] = useState('#7C3AED');
  const [gradCol2, setGradCol2] = useState('#06B6D4');
  const [gradDir, setGradDir] = useState('to bottom right');
  const [isLightMode, setIsLightMode] = useState(() => document.documentElement.classList.contains('light-mode'));

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

  // Load from local storage initially
  useEffect(() => {
    try {
      const savedAppBg = localStorage.getItem('pingme-app-bg');
      if (savedAppBg) setAppBg(JSON.parse(savedAppBg));
      
      const savedChatWp = localStorage.getItem('pingme-chat-wallpaper');
      if (savedChatWp) setChatWp(JSON.parse(savedChatWp));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const saveSettingsToDB = async (updates) => {
    try {
      await axiosInstance.patch('/api/users/settings', { settings: updates });
    } catch (error) {
      console.error('Save settings error:', error);
    }
  };

  const handleApplyAppBg = (option) => {
    setAppBg(option);
    localStorage.setItem('pingme-app-bg', JSON.stringify(option));
    document.documentElement.style.setProperty('--bg-primary', option.bg);
    saveSettingsToDB({ appBackground: option });
  };

  const handleApplyChatWp = (option) => {
    setChatWp(option);
    localStorage.setItem('pingme-chat-wallpaper', JSON.stringify(option));
    document.documentElement.style.setProperty('--chat-bg-color', option.bgColor || option.bg || 'transparent');
    document.documentElement.style.setProperty('--chat-bg-image', option.bgImage || 'none');
    document.documentElement.style.setProperty('--chat-bg-size', option.bgSize || 'auto');
    saveSettingsToDB({ chatWallpaper: option });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ username, bio, status });
      alert('Profile saved!');
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await updateProfile({ avatar: reader.result });
      } catch (err) {
        alert('Failed to upload avatar');
      }
    };
    reader.readAsDataURL(file);
  };

  const renderCard = (item, isAppBg) => {
    const currentSelection = isAppBg ? appBg.id : chatWp.id;
    const isSelected = currentSelection === item.id;
    
    return (
      <div 
        key={item.id} 
        className={`bg-preview-card ${isSelected ? 'selected' : ''}`}
        onClick={() => {
          if (isAppBg) handleApplyAppBg({ type: item.bgImage ? 'pattern' : 'color', ...item });
          else handleApplyChatWp({ type: item.bgImage ? 'pattern' : 'color', ...item });
        }}
      >
        <div 
          className="bg-preview-box" 
          style={{ 
            background: item.bg || item.bgColor || 'transparent',
            backgroundImage: item.bgImage || (item.bg?.includes('gradient') ? item.bg : 'none'),
            backgroundSize: item.bgSize || 'auto'
          }}
        >
          {isSelected && <div className="bg-preview-check">✓</div>}
        </div>
        <span className="bg-preview-label">{item.label}</span>
      </div>
    );
  };

  return (
    <motion.div
      className="settings-sidebar"
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
    >
      <div className="settings-header">
        <button className="back-btn" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
        <h2>Settings</h2>
      </div>

      <div className="settings-tabs">
        <button className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`} onClick={() => setActiveTab('account')}>Account</button>
        <button className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveTab('appearance')}>Appearance</button>
      </div>

      <div className="settings-content">
        <AnimatePresence mode="wait">
          {activeTab === 'account' ? (
            <motion.div key="account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="settings-section">
                <div className="profile-edit-avatar">
                  <img src={user?.avatar} alt="avatar" className="profile-avatar-large" />
                  <button className="edit-avatar-btn" onClick={() => fileInputRef.current?.click()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </button>
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleAvatarSelect} />
                </div>
                <div className="settings-group">
                  <label>Display Name</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} />
                </div>
                <div className="settings-group">
                  <label>Bio</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="A little about yourself..." maxLength={100} rows={2} />
                </div>
                <div className="settings-group">
                  <label>Status Mode</label>
                  <select value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="Online">Online</option>
                    <option value="Away">Away</option>
                    <option value="Busy">Do Not Disturb</option>
                    <option value="Invisible">Invisible</option>
                  </select>
                </div>
                <button className="save-settings-btn" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="appearance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              
              {/* DARK/LIGHT MODE TOGGLE */}
              <div className="settings-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Color Mode</h3>
                  <p className="settings-hint" style={{ margin: 0 }}>Toggle between Dark and Light mode.</p>
                </div>
                <button 
                  onClick={toggleTheme}
                  style={{
                    width: '50px',
                    height: '28px',
                    borderRadius: '14px',
                    background: isLightMode ? '#22C55E' : '#334155',
                    position: 'relative',
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'background 0.3s'
                  }}
                >
                  <motion.div
                    layout
                    initial={false}
                    animate={{ x: isLightMode ? 22 : 2 }}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#FFF',
                      position: 'absolute',
                      top: '2px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  />
                </button>
              </div>

              {/* LIVE PREVIEW PANEL */}
              <div className="theme-preview-panel">
                <div className="theme-preview-sidebar" style={{ background: appBg.bgImage ? 'transparent' : 'var(--bg-secondary)' }}>
                  <div className="fake-chat-item" style={{ width: '80%' }} />
                  <div className="fake-chat-item" style={{ width: '60%' }} />
                  <div className="fake-chat-item" style={{ width: '90%' }} />
                  <div className="fake-chat-item" style={{ width: '50%' }} />
                </div>
                <div className="theme-preview-chat">
                  <div className="fake-bubble received">Hey! How are you?</div>
                  <div className="fake-bubble sent">I'm doing great! Just trying out these new PingMe themes.</div>
                  <div className="fake-bubble received">They look amazing ✨</div>
                </div>
              </div>

              {/* APP BACKGROUND OPTIONS */}
              <div className="settings-section">
                <h3>SECTION A — APP BACKGROUND</h3>
                <p className="settings-hint">Changes the main app background behind sidebar and chat area.</p>
                
                <h4 style={{ fontSize: '13px', color: '#F8FAFC', marginBottom: '12px' }}>Solid Colors</h4>
                <div className="bg-cards-grid">
                  {SOLID_COLORS.map(c => renderCard(c, true))}
                </div>

                <h4 style={{ fontSize: '13px', color: '#F8FAFC', marginBottom: '12px' }}>Gradients</h4>
                <div className="bg-cards-grid">
                  {GRADIENTS.map(c => renderCard(c, true))}
                </div>

                <h4 style={{ fontSize: '13px', color: '#F8FAFC', marginBottom: '12px' }}>Patterns</h4>
                <div className="bg-cards-grid">
                  {PATTERNS.map(c => renderCard(c, true))}
                </div>
              </div>

              {/* CHAT WALLPAPER OPTIONS */}
              <div className="settings-section">
                <h3>SECTION B — CHAT WALLPAPER</h3>
                <p className="settings-hint">Changes only the message area background inside the chat window.</p>
                
                <h4 style={{ fontSize: '13px', color: '#F8FAFC', marginBottom: '12px' }}>Solid Colors</h4>
                <div className="bg-cards-grid">
                  {SOLID_COLORS.map(c => renderCard(c, false))}
                </div>

                <h4 style={{ fontSize: '13px', color: '#F8FAFC', marginBottom: '12px' }}>Gradients</h4>
                <div className="bg-cards-grid">
                  {GRADIENTS.map(c => renderCard(c, false))}
                </div>

                <h4 style={{ fontSize: '13px', color: '#F8FAFC', marginBottom: '12px' }}>Patterns</h4>
                <div className="bg-cards-grid">
                  {PATTERNS.map(c => renderCard(c, false))}
                </div>

                {/* Custom Color Selector */}
                <h4 style={{ fontSize: '13px', color: '#F8FAFC', marginBottom: '12px' }}>Custom Color</h4>
                <div className="gradient-builder-row">
                  <div className="color-picker-wrap">
                    <input 
                      type="color" 
                      value={customColor} 
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        handleApplyChatWp({ id: 'custom_color', bg: e.target.value, label: 'Custom' });
                      }} 
                    />
                  </div>
                </div>

                {/* Custom Gradient Builder */}
                <h4 style={{ fontSize: '13px', color: '#F8FAFC', marginBottom: '12px', marginTop: '24px' }}>Custom Gradient Builder</h4>
                <div className="gradient-builder">
                  
                  <div className="gradient-builder-row">
                    <div className="color-picker-wrap">
                      <label>Color 1</label>
                      <input type="color" value={gradCol1} onChange={e => setGradCol1(e.target.value)} />
                    </div>
                    <div className="color-picker-wrap">
                      <label>Color 2</label>
                      <input type="color" value={gradCol2} onChange={e => setGradCol2(e.target.value)} />
                    </div>
                  </div>
                  
                  <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>Direction</label>
                  <div className="gradient-dir-grid" style={{ marginBottom: '16px' }}>
                    {GRADIENT_DIRS.map(dir => (
                      <button 
                        key={dir.id}
                        className={`gradient-dir-btn ${gradDir === dir.val ? 'active' : ''}`}
                        onClick={() => setGradDir(dir.val)}
                      >
                        {dir.icon}
                      </button>
                    ))}
                  </div>

                  <div 
                    className="gradient-preview" 
                    style={{ background: `linear-gradient(${gradDir}, ${gradCol1}, ${gradCol2})` }}
                  />

                  <button 
                    className="save-settings-btn" 
                    style={{ width: '100%' }}
                    onClick={() => {
                      const gradBg = `linear-gradient(${gradDir}, ${gradCol1}, ${gradCol2})`;
                      handleApplyChatWp({ id: 'custom_grad', bg: gradBg, label: 'Custom Grad' });
                    }}
                  >
                    Apply Custom Gradient
                  </button>
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
