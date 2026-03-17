import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import RoomList from './RoomList';
import ContextMenu from './ContextMenu';
import DeleteChatModal from './DeleteChatModal';
import RemoveContactModal from './RemoveContactModal';
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
  deleteChat,
  removeContact,
  contacts,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const navigate = useNavigate();

  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [contactToRemove, setContactToRemove] = useState(null);

  // Search users
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
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleUserClick = async (selectedUser) => {
    await onCreateRoom(selectedUser._id);
    setSearchQuery('');
    setSearchResults([]);
  };

  const getContactId = (room) => {
    if (room.type === 'group') return null;
    const otherMember = room.members?.find((m) => m._id !== user?._id);
    return otherMember?._id || null;
  };

  const filteredRooms = rooms.filter((room) => {
    if (activeTab === 'chats') {
      if (room.type !== 'private') return false;
      const otherMemberId = getContactId(room);
      return contacts?.some(c => c._id === otherMemberId);
    }
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

  // getContactId was moved up

  const isRoomOnline = (room) => {
    if (room.type === 'group') return false;
    const otherMember = room.members?.find((m) => m._id !== user?._id);
    return otherMember ? onlineUsers.has(otherMember._id) : false;
  };

  // Handle right-click on a room
  const handleContextMenu = (e, room) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      room,
    });
  };

  const closeContextMenu = () => setContextMenu(null);

  // Action Handlers
  const handleDeleteChatClick = (room) => {
    setRoomToDelete(room);
  };

  const handleRemoveContactClick = (room) => {
    setContactToRemove(room);
  };

  const confirmDeleteChat = async () => {
    if (roomToDelete) {
      try {
        await deleteChat(roomToDelete._id);
        setRoomToDelete(null);
      } catch (err) {
        console.error('Error deleting chat');
      }
    }
  };

  const confirmRemoveContact = async () => {
    if (contactToRemove) {
      try {
        const contactId = getContactId(contactToRemove);
        if (contactId) {
          await removeContact(contactId);
        }
        setContactToRemove(null);
      } catch (err) {
        console.error('Error removing contact');
      }
    }
  };

  const renderContextMenu = () => {
    if (!contextMenu) return null;
    const { room } = contextMenu;
    const isContact = room.type === 'private';
    
    // Check if the other person is actually in our contacts list
    // (We passed down `contacts` array from useChat)
    const otherMemberId = getContactId(room);
    const isActuallyContact = contacts?.some(c => c._id === otherMemberId);

    const options = [
      {
        label: (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            Pin Chat
          </>
        ),
        onClick: () => console.log('Pin Chat clicked'),
      },
      {
        label: (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              <line x1="23" y1="1" x2="1" y2="23"></line>
            </svg>
            Mute Notifications
          </>
        ),
        onClick: () => console.log('Mute clicked'),
      },
      {
        label: (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            Delete Chat
          </>
        ),
        danger: true,
        onClick: () => handleDeleteChatClick(room),
      },
    ];

    if (isContact && isActuallyContact) {
      options.push({
        label: (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="18" y1="8" x2="23" y2="13" />
              <line x1="23" y1="8" x2="18" y2="13" />
            </svg>
            Remove Contact
          </>
        ),
        danger: true,
        onClick: () => handleRemoveContactClick(room),
      });
    }

    return (
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        options={options}
        onClose={closeContextMenu}
      />
    );
  };

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          {/* PingMe Logo */}
          <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="12" fill="url(#pingme-grad)" />
            <path d="M12 20C12 15.58 15.58 12 20 12C24.42 12 28 15.58 28 20C28 24.42 24.42 28 20 28C18.9 28 17.85 27.78 16.9 27.38L12 28L13.2 24.2C12.44 22.96 12 21.52 12 20Z" fill="white" />
            {/* Signal waves */}
            <circle cx="26" cy="14" r="1.5" fill="white" opacity="0.9"/>
            <path d="M27.5 11.5 Q29.5 13.5 27.5 15.5" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8"/>
            <path d="M29 10 Q32 13.5 29 17" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5"/>
            <defs>
              <linearGradient id="pingme-grad" x1="0" y1="0" x2="40" y2="40">
                <stop stopColor="#7c3aed" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <h2>PingMe</h2>
        </div>
        {/* New Group button in header */}
        <button className="icon-btn" onClick={onNewGroup} title="New Group">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </button>
      </div>

      {/* Search */}
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
        <button className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => setActiveTab('chats')}>
          Chats
        </button>
        <button className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`} onClick={() => setActiveTab('groups')}>
          Groups
        </button>
      </div>

      {/* Room List */}
      <div className="sidebar-rooms">
        {loadingRooms ? (
          <div className="sidebar-loading"><div className="spinner" /></div>
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
            onContextMenu={handleContextMenu}
          />
        )}
      </div>

      {/* Footer with user avatar + profile + settings */}
      <div className="sidebar-footer-nav">
        <motion.button
          className="nav-avatar-btn"
          onClick={() => navigate('/profile')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="My Profile"
        >
          <div className="nav-avatar-wrapper">
            <img src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=7c3aed&color=fff&bold=true`} alt="me" className="nav-avatar" />
            <span className="online-dot pulse" />
          </div>
          <div className="nav-user-info">
            <span className="nav-username">{user?.username}</span>
            <span className="nav-status">{user?.status || 'Online'}</span>
          </div>
        </motion.button>
        <div className="nav-actions">
          <motion.button className="icon-btn" onClick={() => navigate('/settings')} whileHover={{ scale: 1.1 }} title="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </motion.button>
          <motion.button className="icon-btn danger" onClick={logout} whileHover={{ scale: 1.1 }} title="Logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </motion.button>
        </div>
      </div>

      {/* Context Menu Portal */}
      {renderContextMenu()}

      {/* Modals */}
      <DeleteChatModal
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        onConfirm={confirmDeleteChat}
        isGroup={roomToDelete?.type === 'group'}
      />

      <RemoveContactModal
        isOpen={!!contactToRemove}
        onClose={() => setContactToRemove(null)}
        onConfirm={confirmRemoveContact}
        contactName={contactToRemove ? getRoomName(contactToRemove) : ''}
      />
    </div>
  );
}
