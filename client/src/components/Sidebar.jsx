import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import RoomList from './RoomList';
import axiosInstance from '../utils/axiosInstance';

export default function Sidebar({
  rooms,
  currentRoom,
  onSelectRoom,
  onNewGroup,
  onCreateRoom,
  loadingRooms,
  unreadCounts,
  typingUsers,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();

  // Search users
  const searchUsers = useCallback(async (q) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);
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
    return otherMember?.username || 'Unknown';
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

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="12" fill="url(#sidebar-logo-grad)" />
            <path d="M12 20C12 15.58 15.58 12 20 12C24.42 12 28 15.58 28 20C28 24.42 24.42 28 20 28C18.9 28 17.85 27.78 16.9 27.38L12 28L13.2 24.2C12.44 22.96 12 21.52 12 20Z" fill="white" />
            <defs>
              <linearGradient id="sidebar-logo-grad" x1="0" y1="0" x2="40" y2="40">
                <stop stopColor="#7c3aed" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <h2>ChatFlow</h2>
        </div>
        <button className="logout-btn" onClick={logout} title="Logout">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
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
            <div className="search-results-label">Users</div>
            {searchResults.map((u) => (
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
                  <span className="search-result-email">{u.email}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="sidebar-tabs">
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
          <div className="sidebar-loading">
            <div className="spinner" />
          </div>
        ) : (
          <RoomList
            rooms={filteredRooms}
            currentRoom={currentRoom}
            onSelectRoom={onSelectRoom}
            getRoomName={getRoomName}
            getRoomAvatar={getRoomAvatar}
            isRoomOnline={isRoomOnline}
            unreadCounts={unreadCounts}
            typingUsers={typingUsers}
          />
        )}
      </div>

      {/* New Group Button */}
      <div className="sidebar-footer">
        <motion.button
          className="new-group-btn"
          onClick={onNewGroup}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
          New Group
        </motion.button>
      </div>
    </div>
  );
}
