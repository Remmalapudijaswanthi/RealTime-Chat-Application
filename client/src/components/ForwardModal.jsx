import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ForwardModal({ isOpen, onClose, message, rooms, onForward, currentUser }) {
  const [search, setSearch] = useState('');
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [isForwarding, setIsForwarding] = useState(false);

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      let name = '';
      if (room.type === 'group') {
        name = room.name;
      } else {
        const otherMember = room.members?.find(m => m._id !== currentUser?._id);
        name = otherMember?.username || 'Unknown';
      }
      return name.toLowerCase().includes(search.toLowerCase());
    });
  }, [rooms, search, currentUser]);

  const toggleRoom = (roomId) => {
    setSelectedRooms(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId) 
        : [...prev, roomId]
    );
  };

  const handleForward = async () => {
    if (selectedRooms.length === 0) return;
    setIsForwarding(true);
    try {
      await onForward(message._id, selectedRooms);
      onClose();
    } catch (error) {
      alert('Failed to forward message');
    } finally {
      setIsForwarding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      backdropFilter: 'blur(4px)'
    }}>
      <motion.div 
        className="forward-modal" 
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        style={{
          background: '#141414',
          width: '380px',
          maxHeight: '70vh',
          borderRadius: '20px',
          border: '1px solid #2A2A2A',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="modal-header" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2A2A2A' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>Forward Message</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8696a0', fontSize: '24px', cursor: 'pointer' }}>×</button>
        </div>

        {/* Message Preview */}
        <div style={{ padding: '16px 20px', background: '#1A1A1A' }}>
          <div style={{ 
            background: '#222', 
            borderRadius: '10px', 
            padding: '10px 14px', 
            borderLeft: '3px solid #C084FC',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {message.type === 'image' && (
              <img src={message.content} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} alt="preview" />
            )}
            {message.type === 'voice' && <span style={{ fontSize: '18px' }}>🎵</span>}
            {message.type === 'file' && <span style={{ fontSize: '18px' }}>📄</span>}
            
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {message.type === 'text' ? message.content : (message.type === 'voice' ? 'Voice Message' : (message.fileName || 'File'))}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search contacts or groups"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: '#222',
                border: '1px solid #333',
                borderRadius: '10px',
                padding: '10px 12px 10px 38px',
                color: 'white',
                fontSize: '14px'
              }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
          </div>
        </div>

        {/* Room List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
          {filteredRooms.map(room => {
            const isSelected = selectedRooms.includes(room._id);
            let name = '';
            let avatar = '';
            if (room.type === 'group') {
              name = room.name;
              avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=06b6d4&color=fff&bold=true`;
            } else {
              const otherMember = room.members?.find(m => m._id !== currentUser?._id);
              name = otherMember?.username || 'Unknown';
              avatar = otherMember?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff&bold=true`;
            }

            return (
              <div 
                key={room._id} 
                className="room-item-forward"
                onClick={() => toggleRoom(room._id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 10px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(192, 132, 252, 0.1)' : 'transparent',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <img src={avatar} style={{ width: '40px', height: '40px', borderRadius: '50%' }} alt="avatar" />
                  {isSelected && (
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '-2px', 
                      right: '-2px', 
                      background: '#C084FC', 
                      borderRadius: '50%', 
                      width: '18px', 
                      height: '18px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '2px solid #141414'
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', color: isSelected ? '#C084FC' : 'white' }}>{name}</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{room.type === 'group' ? 'Group' : 'Contact'}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px', borderTop: '1px solid #2A2A2A', display: 'flex', gap: '12px' }}>
          <button 
            onClick={onClose}
            style={{ 
              flex: 1, 
              padding: '12px', 
              background: 'transparent', 
              border: '1px solid #333', 
              borderRadius: '12px', 
              color: 'white', 
              fontWeight: '600', 
              cursor: 'pointer' 
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleForward}
            disabled={selectedRooms.length === 0 || isForwarding}
            style={{ 
              flex: 2, 
              padding: '12px', 
              background: selectedRooms.length === 0 ? '#222' : '#C084FC', 
              border: 'none', 
              borderRadius: '12px', 
              color: selectedRooms.length === 0 ? '#555' : 'white', 
              fontWeight: '700', 
              cursor: selectedRooms.length === 0 ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isForwarding ? <div className="spinner small" /> : null}
            Forward {selectedRooms.length > 0 ? `(${selectedRooms.length})` : ''}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
