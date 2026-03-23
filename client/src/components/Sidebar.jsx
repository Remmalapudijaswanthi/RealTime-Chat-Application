import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import RoomList from './RoomList';
import Logo from './Logo';
import axiosInstance from '../utils/axiosInstance';
import MyProfileModal from './MyProfileModal';
import ContactProfileDrawer from './ContactProfileDrawer';
import ChatLockModal from './ChatLockModal';
import { ChatListSkeleton, SearchSkeleton } from './Skeletons';

export default function Sidebar({
  rooms,
  currentRoom,
  onSelectRoom,
  onNewGroup,
  onCreateRoom,
  loadingRooms,
  unreadCounts,
  typingUsers,
  onDeleteChat,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showLockSetup, setShowLockSetup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [isLightMode, setIsLightMode] = useState(() => document.documentElement.classList.contains('light-mode'));
  const { user, setUser, logout } = useAuth();
  const { onlineUsers } = useSocket();

  useEffect(() => {
    const handleThemeChange = () => setIsLightMode(document.documentElement.classList.contains('light-mode'));
    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const newMode = isLightMode ? 'dark' : 'light';
    setIsLightMode(!isLightMode);
    localStorage.setItem('pingme-color-mode', newMode);
    
    // Apply to document root AND body AND html
    document.documentElement.classList.remove('light-mode', 'dark-mode');
    document.body.classList.remove('light-mode', 'dark-mode');
    
    document.documentElement.classList.add(`${newMode}-mode`);
    document.body.classList.add(`${newMode}-mode`);
    
    // Also set data attribute as backup
    document.documentElement.setAttribute('data-theme', newMode);
    
    window.dispatchEvent(new Event('themeChange'));
  };

  // Search users (debounced)
  const searchUsers = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    try {
      setSearching(true);
      const res = await axiosInstance.get(`/api/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchUsers(searchQuery);
      else setSearchResults([]);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleUserClick = async (selectedUser) => {
    await onCreateRoom(selectedUser._id);
    setSearchQuery('');
    setSearchResults([]);
  };

  const filteredRooms = rooms.filter((room) => {
    if (activeTab === 'chats') return room.type === 'private';
    return room.type === 'group';
  });

  const getRoomName = (room) => {
    if (room.type === 'group') return room.name;
    const otherMember = room.members?.find((m) => m._id !== user?._id);
    if (!otherMember) return 'Unknown';
    const contact = user?.contacts?.find((c) => c.user === otherMember._id || c.user?._id === otherMember._id);
    return contact?.nickname || otherMember.username;
  };

  const getRoomAvatar = (room) => {
    if (room.type === 'group') {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(room.name)}&background=06b6d4&color=fff&bold=true&size=128`;
    }
    const otherMember = room.members?.find((m) => m._id !== user?._id);
    return otherMember?.avatar || '';
  };

  const isRoomOnline = (room) => {
    if (room.type === 'group') return false;
    const otherMember = room.members?.find((m) => m._id !== user?._id);
    return otherMember ? onlineUsers.has(otherMember._id) : false;
  };

  const handleContextMenu = (e, room) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, room });
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleToggleLock = async (room) => {
    if (!user?.settings?.chatLockPin) {
      setShowLockSetup(true);
      return;
    }

    try {
      const res = await axiosInstance.patch(`/api/users/profile/chat-lock/${room._id}/toggle`);
      setUser(prev => ({ 
        ...prev, 
        settings: { ...prev.settings, lockedChats: res.data } 
      }));
    } catch (err) {
      console.error('Failed to toggle lock', err);
    }
  };

  const handleDeleteClick = () => {
    setRoomToDelete(contextMenu.room);
    setShowDeleteConfirm(true);
    setContextMenu(null);
  };

  const confirmDelete = async () => {
    if (!roomToDelete) return;
    try {
      await onDeleteChat(roomToDelete._id);
      setShowDeleteConfirm(false);
      setRoomToDelete(null);
    } catch (err) {
      alert('Failed to delete chat');
    }
  };

  const tabIndicatorStyle = {
    left: activeTab === 'chats' ? '0%' : '50%',
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <Logo size={32} />
          <h2>
            <span style={{ color: 'var(--logo-primary)', fontWeight: 900 }}>Ping</span>
            <span style={{ color: 'var(--logo-secondary)', fontWeight: 900 }}>Me</span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={toggleTheme} title="Toggle Theme" style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px', fontSize: '18px' }}>
            {isLightMode ? '🌙' : '☀️'}
          </button>
          <button className="logout-btn" onClick={logout} title="Logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>


      <div className="sidebar-search">
        <div className="search-input-wrapper">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); }}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* Search Results */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div
            className="search-results"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {searching ? (
              <SearchSkeleton />
            ) : (
              searchResults.map((u) => (
                <motion.div
                  key={u._id}
                  className="search-result-item"
                  onClick={() => handleUserClick(u)}
                  whileHover={{ backgroundColor: 'rgba(124, 58, 237, 0.1)' }}
                >
                  <div className="avatar-wrapper">
                    <img src={u.avatar} alt={u.username} className="avatar" />
                    {onlineUsers.has(u._id) && <span className="online-dot" />}
                  </div>
                  <div className="search-result-info">
                    <span className="search-result-name">{u.username}</span>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="sidebar-tabs">
        <div className="tab-indicator" style={tabIndicatorStyle} />
        <button
          className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          Chats
        </button>
        <button
          className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          Groups
        </button>
      </div>

      {/* Room List */}
      <div className="sidebar-rooms">
        {loadingRooms ? (
          <ChatListSkeleton />
        ) : (
          <div onContextMenu={(e) => {
            // Find the room from the click target or delegate
            const roomEl = e.target.closest('.room-item');
            if (roomEl) {
              // This is a bit hacky since RoomList doesn't expose individuals
              // In a real app, RoomList would take onContextMenu prop
            }
          }}>
            <RoomList
              rooms={filteredRooms}
              currentRoom={currentRoom}
              onSelectRoom={onSelectRoom}
              getRoomName={getRoomName}
              getRoomAvatar={getRoomAvatar}
              isRoomOnline={isRoomOnline}
              unreadCounts={unreadCounts}
              typingUsers={typingUsers}
              onContextMenu={handleContextMenu}
            />
          </div>
        )}
      </div>

      <div className="sidebar-footer">
        <motion.div 
          className="sidebar-profile-card"
          onClick={() => setShowMyProfile(true)}
          whileHover={{ background: 'rgba(255, 255, 255, 0.08)' }}
        >
          <div className="profile-card-avatar">
            <img src={user?.avatar} alt={user?.username} />
            <span className={`online-dot tiny ${user?.status === 'Online' ? 'active' : ''}`} />
          </div>
          <div className="profile-card-info">
            <span className="profile-card-name">{user?.username}</span>
            <span className="profile-card-status">{user?.status || 'Online'}</span>
          </div>
          <button 
            className="profile-card-settings" 
            onClick={(e) => {
              e.stopPropagation();
              // Navigate to Settings
              const event = new CustomEvent('openSettings', { detail: { section: 'appearance' } });
              window.dispatchEvent(event);
            }}
            title="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </motion.div>
      </div>

      <MyProfileModal 
        isOpen={showMyProfile} 
        onClose={() => setShowMyProfile(false)} 
        onOpenSettings={(section) => {
          setShowMyProfile(false);
          const event = new CustomEvent('openSettings', { detail: { section } });
          window.dispatchEvent(event);
        }}
      />
      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: '#1A1A1A',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '6px',
              zIndex: 3000,
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              minWidth: '160px'
            }}
          >
            <button 
              onClick={() => handleToggleLock(contextMenu.room)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                color: '#F8FAFC',
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '8px'
              }}
              className="context-menu-item"
            >
              <span>{(user?.settings?.lockedChats || []).includes(contextMenu.room._id) ? '🔓 Unlock Chat' : '🔒 Lock Chat'}</span>
            </button>
            <button 
              onClick={handleDeleteClick}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                color: '#EF4444',
                fontSize: '13px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '8px'
              }}
              className="context-menu-item"
            >
              <span>🗑️ Delete Chat</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowDeleteConfirm(false)}>
            <motion.div 
              className="delete-modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-secondary)', borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '400px', textAlign: 'center', border: '1px solid var(--border)' }}
            >
              <div className="delete-modal-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>Delete this chat?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                This will remove the chat from your list. This action cannot be undone.
              </p>
              <div className="delete-modal-btns" style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--bg-surface)', border: 'none', color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="btn-danger"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#EF4444', border: 'none', color: 'white', fontWeight: '600', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ChatLockModal 
        isOpen={showLockSetup}
        mode="setup"
        onVerify={() => setShowLockSetup(false)}
        onClose={() => setShowLockSetup(false)}
      />
    </div>
  );
}
