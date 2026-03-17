import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../utils/axiosInstance';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [status, setStatus] = useState(user?.status || 'Online');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [avatarBase64, setAvatarBase64] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const statusOptions = ['Online', 'Away', 'Busy', 'Invisible'];

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatarPreview(ev.target.result);
      setAvatarBase64(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(''); setError('');
    if (!username.trim()) { setError('Name cannot be empty'); return; }
    try {
      setSaving(true);
      const payload = { username: username.trim(), bio: bio.trim(), status };
      if (avatarBase64) payload.avatar = avatarBase64;
      const res = await axiosInstance.put('/api/users/profile', payload);
      setUser(res.data.user);
      setMsg('Profile saved!');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <motion.div
        className="profile-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Back */}
        <button className="profile-back-btn" onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <h1 className="profile-title">My Profile</h1>

        {/* Avatar */}
        <div className="profile-avatar-section">
          <motion.div
            className="profile-avatar-wrapper"
            whileHover={{ scale: 1.04 }}
            onClick={() => fileRef.current?.click()}
          >
            <img
              src={avatarPreview || `https://ui-avatars.com/api/?name=${username}&background=7c3aed&color=fff&bold=true&size=200`}
              alt="avatar"
              className="profile-avatar"
            />
            <div className="profile-avatar-overlay">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>Change Photo</span>
            </div>
          </motion.div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        {/* Form */}
        <form className="profile-form" onSubmit={handleSave}>
          {msg && <div className="profile-success">{msg}</div>}
          {error && <div className="profile-error">{error}</div>}

          <div className="form-group">
            <label>Display Name</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={32}
              placeholder="Your name"
            />
          </div>

          <div className="form-group">
            <label>Bio <span className="char-count">{bio.length}/100</span></label>
            <textarea
              className="profile-bio-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={100}
              rows={3}
              placeholder="Tell others about yourself…"
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <div className="status-options">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`status-chip ${status === s ? 'active' : ''} status-${s.toLowerCase()}`}
                  onClick={() => setStatus(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <motion.button
            className="auth-btn"
            type="submit"
            disabled={saving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
