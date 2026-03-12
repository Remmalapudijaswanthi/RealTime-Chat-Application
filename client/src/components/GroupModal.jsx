import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axiosInstance from '../utils/axiosInstance';

export default function GroupModal({ onClose, onCreateGroup }) {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Search users
  const searchUsers = useCallback(async (q) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await axiosInstance.get(`/api/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.filter((u) => !selectedUsers.find((s) => s._id === u._id)));
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, [selectedUsers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchUsers(searchQuery);
      else setSearchResults([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const addUser = (user) => {
    setSelectedUsers((prev) => [...prev, user]);
    setSearchResults((prev) => prev.filter((u) => u._id !== user._id));
    setSearchQuery('');
  };

  const removeUser = (userId) => {
    setSelectedUsers((prev) => prev.filter((u) => u._id !== userId));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    if (selectedUsers.length === 0) {
      setError('Add at least one member');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onCreateGroup(
        groupName.trim(),
        selectedUsers.map((u) => u._id)
      );
      onClose();
    } catch (err) {
      setError('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Create New Group</h3>
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && (
          <motion.div
            className="modal-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.div>
        )}

        <div className="modal-body">
          <div className="form-group">
            <label>Group Name</label>
            <input
              type="text"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="modal-input"
            />
          </div>

          <div className="form-group">
            <label>Add Members</label>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="modal-input"
            />
          </div>

          {/* Selected users */}
          {selectedUsers.length > 0 && (
            <div className="selected-users">
              {selectedUsers.map((u) => (
                <motion.div
                  key={u._id}
                  className="selected-user-chip"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  layout
                >
                  <img src={u.avatar} alt={u.username} className="chip-avatar" />
                  <span>{u.username}</span>
                  <button onClick={() => removeUser(u._id)} className="chip-remove">×</button>
                </motion.div>
              ))}
            </div>
          )}

          {/* Search results */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                className="modal-search-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {searchResults.map((u) => (
                  <div
                    key={u._id}
                    className="modal-search-item"
                    onClick={() => addUser(u)}
                  >
                    <img src={u.avatar} alt={u.username} className="avatar" />
                    <div>
                      <span className="modal-search-name">{u.username}</span>
                      <span className="modal-search-email">{u.email}</span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <motion.button
            className="btn-primary"
            onClick={handleCreate}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
