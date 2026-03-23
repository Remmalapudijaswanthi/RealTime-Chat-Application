import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import Logo from './Logo';
import { formatLastSeen } from '../utils/formatTime';
import axiosInstance from '../utils/axiosInstance';
import ContactProfileDrawer from './ContactProfileDrawer';
import ChatLockModal from './ChatLockModal';
import WallpaperModal from './WallpaperModal';
import ForwardModal from './ForwardModal';
import { loadWallpaper, applyWallpaperToDOM } from '../utils/wallpaperStorage';
import { MessagesSkeleton } from './Skeletons';
import EmojiPicker from 'emoji-picker-react';

const DEFAULT_TEMPLATES = [
  "Hey! How are you? 👋", "Good morning! ☀️", "Good evening! 🌙",
  "What's up? 😊", "I'll get back to you shortly", "Sure, no problem! 👍",
  "On my way!", "Let me check and confirm", "Can we talk later?",
  "I'm busy right now", "Thanks! 🙏", "Okay got it ✅",
  "Sounds good!", "I'll be there",
];

export default function ChatWindow({
  currentRoom,
  messages,
  rooms,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onStartTyping,
  onStopTyping,
  typingUsers,
  loadingMessages,
  hasMoreMessages,
  onLoadMore,
  onBack,
  onReaction,
  onReply,
  replyingTo,
  onCancelReply,
  pinnedMessages,
  onPin,
  onUnpin,
  scrollToMessageId,
}) {
  const [inputValue, setInputValue] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [highlightedMsg, setHighlightedMsg] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [fileCaption, setFileCaption] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [showContactDrawer, setShowContactDrawer] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [newMessagesWhileScrolled, setNewMessagesWhileScrolled] = useState(0);
  const [chatWallpaper, setChatWallpaper] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCameraView, setShowCameraView] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatInputRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraRef = useRef(null);
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const docRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [uploading, setUploading] = useState(false);
  const { user, setUser } = useAuth();
  const { onlineUsers } = useSocket();

  useEffect(() => {
    setIsUnlocked(false);
    setShowLockModal(false);
  }, [currentRoom?._id]);

  useEffect(() => {
    const handler = (e) => {
      applyWallpaperToDOM(e.detail);
    };
    window.addEventListener('pingme:wallpaper', handler);
    return () => window.removeEventListener('pingme:wallpaper', handler);
  }, []);

  useEffect(() => {
    if (currentRoom) {
      const saved = loadWallpaper();
      if (saved) {
        setTimeout(() => {
          applyWallpaperToDOM(saved);
        }, 50);
      }
    }
  }, [currentRoom?._id]);

  const otherMember = currentRoom?.type === 'private'
    ? currentRoom.members?.find((m) => m._id !== user?._id)
    : null;

  let roomName = 'Unknown';
  if (currentRoom?.type === 'group') {
    roomName = currentRoom.name;
  } else if (otherMember) {
    const contact = user?.contacts?.find(c => c.user === otherMember._id || c.user?._id === otherMember._id);
    roomName = contact?.nickname || otherMember.username;
  }

  const roomAvatar = currentRoom?.type === 'group'
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(currentRoom.name)}&background=06b6d4&color=fff&bold=true&size=128`
    : otherMember?.avatar || '';

  const isOnline = currentRoom?.type === 'private' && otherMember
    ? onlineUsers.has(otherMember._id)
    : false;

  const memberCount = currentRoom?.type === 'group'
    ? currentRoom.members?.length || 0
    : 0;

  const typingUser = currentRoom ? typingUsers[currentRoom._id] : null;
  const activePinned = pinnedMessages?.length > 0 ? pinnedMessages[pinnedMessages.length - 1] : null;

  const isBlocked = otherMember ? user?.blockedUsers?.includes(otherMember._id) : false;
  const isMuted = currentRoom ? user?.mutedChats?.some(m => m.room === currentRoom._id || m.room?._id === currentRoom._id) : false;

  const handleToggleBlock = async () => {
    if (!otherMember) return;
    try {
      if (isBlocked) {
        await axiosInstance.delete(`/api/users/block/${otherMember._id}`);
        setUser(prev => ({ ...prev, blockedUsers: prev.blockedUsers.filter(id => id !== otherMember._id) }));
      } else {
        await axiosInstance.post(`/api/users/block/${otherMember._id}`);
        setUser(prev => ({ ...prev, blockedUsers: [...(prev.blockedUsers || []), otherMember._id] }));
      }
    } catch (err) {
      alert('Failed to update block status');
    }
  };


  const handleToggleMute = async () => {
    try {
      if (isMuted) {
        await axiosInstance.delete(`/api/users/mute/${currentRoom._id}`);
        setUser(prev => ({ ...prev, mutedChats: prev.mutedChats.filter(m => m.room !== currentRoom._id && m.room?._id !== currentRoom._id) }));
      } else {
        await axiosInstance.patch(`/api/users/mute/${currentRoom._id}`, { mutedUntil: null });
        setUser(prev => ({ ...prev, mutedChats: [...(prev.mutedChats || []), { room: currentRoom._id, mutedUntil: null }] }));
      }
    } catch (err) {
      alert('Failed to update mute status');
    }
  };

  const handleScheduleSend = async () => {
    if (!inputValue.trim() || !scheduleDate) return;
    try {
      await axiosInstance.post('/api/chats/schedule', {
        roomId: currentRoom._id,
        content: inputValue.trim(),
        scheduledAt: new Date(scheduleDate).toISOString()
      });
      alert('Message scheduled!');
      setShowScheduleModal(false);
      setInputValue('');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to schedule message');
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 400;
    
    if (isNearBottom) {
      scrollToBottom('smooth');
      setNewMessagesWhileScrolled(0);
    } else {
      // If we're not near bottom, don't auto-scroll and increment counter
      setNewMessagesWhileScrolled(prev => prev + 1);
    }
  }, [messages]);

  // Update browser title
  useEffect(() => {
    if (user) {
      const unread = 0; // Could aggregate from unreadCounts
      document.title = unread > 0
        ? `(${unread}) PingMe • ${user.username}`
        : `PingMe • ${user.username}`;
    }
    return () => { document.title = 'PingMe'; };
  }, [user]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Load more (scroll to top)
    if (container.scrollTop === 0 && hasMoreMessages && !loadingMessages) {
      onLoadMore();
    }

    // Show/hide scroll bottom button
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 400;
    setShowScrollBottom(!isNearBottom);
    if (isNearBottom) setNewMessagesWhileScrolled(0);
  }, [hasMoreMessages, loadingMessages, onLoadMore]);

  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onStartTyping();
    typingTimeoutRef.current = setTimeout(() => { onStopTyping(); }, 2000);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    if (editingMessage) {
      onEditMessage(editingMessage._id, inputValue.trim());
      setEditingMessage(null);
    } else {
      onSendMessage(inputValue.trim());
    }

    setInputValue('');
    onStopTyping();
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      if (editingMessage) { setEditingMessage(null); setInputValue(''); }
      if (replyingTo) onCancelReply?.();
    }
  };

  const handleEdit = (message) => {
    setEditingMessage(message);
    setInputValue(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputValue('');
  };

  // Scroll to a specific message (for reply click or external trigger)
  const scrollToMessage = useCallback((messageId) => {
    if (!messageId) return;
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsg(messageId);
      setTimeout(() => setHighlightedMsg(null), 1500);
    }
  }, []);

  useEffect(() => {
    if (scrollToMessageId) {
      // Delay slightly to ensure messages are rendered if room just switched
      const timer = setTimeout(() => scrollToMessage(scrollToMessageId), 300);
      return () => clearTimeout(timer);
    }
  }, [scrollToMessageId, messages, scrollToMessage]);

  // New Media Handlers
  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} is too large. Max 10MB`);
        continue;
      }
      
      setUploading(true);
      try {
        const compressed = await compressImage(file);
        await sendMediaMessage({
          content: compressed,
          type: 'image',
          caption: ''
        });
      } catch (err) {
        console.error('Failed to send photo:', err);
      } finally {
        setUploading(false);
      }
    }
    e.target.value = '';
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setShowCameraView(true);
      setCameraStream(stream);
      // Give the video element a moment to render before assigning srcObject
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play();
        }
      }, 50);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        alert('Camera permission denied. Please allow camera access.');
      } else if (err.name === 'NotFoundError') {
        alert('No camera found on this device');
      } else {
        cameraRef.current?.click();
      }
    }
  };

  const capturePhoto = () => {
    if (!cameraVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideoRef.current.videoWidth;
    canvas.height = cameraVideoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(cameraVideoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    sendMediaMessage({ content: base64, type: 'image', caption: 'Camera photo' });
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setShowCameraView(false);
  };

  const handleCameraCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      await sendMediaMessage({ content: compressed, type: 'image', caption: '' });
    } catch (err) {
      console.error('Camera capture error:', err);
    } finally {
      setUploading(false);
    }
    e.target.value = '';
  };

  const handleVideoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 30 * 1024 * 1024) {
      alert('Video must be under 30MB');
      e.target.value = '';
      return;
    }
    
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result;
        await sendMediaMessage({
          content: base64,
          type: 'video',
          caption: file.name
        });
        setUploading(false);
      };
      reader.onerror = () => {
        alert('Failed to read video file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Video send error:', err);
      setUploading(false);
    }
    e.target.value = '';
  };

  const handleAudioSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 20 * 1024 * 1024) {
      alert('Audio must be under 20MB');
      e.target.value = '';
      return;
    }
    
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      await sendMediaMessage({
        content: base64,
        type: 'audio',
        caption: file.name
      });
      setUploading(false);
    } catch (err) {
      console.error('Audio select error:', err);
      setUploading(false);
    }
    e.target.value = '';
  };

  const handleDocSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('Document size must be less than 20MB');
      e.target.value = '';
      return;
    }

    const formatSize = (bytes) => {
      if (bytes === 0) return '0 B';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024*1024)).toFixed(1) + ' MB';
      return (bytes / (1024*1024*1024)).toFixed(1) + ' GB';
    };

    const formattedSize = formatSize(file.size);

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      await sendMediaMessage({
        content: base64,
        type: 'document',
        caption: `${file.name}|||${formattedSize}`
      });
      setUploading(false);
    } catch (err) {
      console.error('Doc send error:', err);
      alert('Failed to send file');
      setUploading(false);
    }
    e.target.value = '';
  };


  const sendMediaMessage = async ({ content, type, caption }) => {
    try {
      const response = await axiosInstance.post(
        `/api/chats/room/${currentRoom._id}/messages`,
        { content, type, caption }
      );
      
      if (response.data.success) {
        // Message will come back via socket if not using optimistic UI
        // But we add it here if the parent doesn't handle socket 'receive_message' for us
        // In this app, onSendMessage is usually passed in. Let's use it for consistency.
        onSendMessage(content, { type, caption, fileName: caption.split('|')[0] });
      }
    } catch (err) {
      console.error('Send media error:', err);
      alert('Failed to send file');
    }
  };

  const handleConfirmPreview = () => {
    if (!previewFile) return;
    // Fallback if this is ever called
    setPreviewFile(null);
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Mic access error:', error);
      alert('Microphone access needed for voice messages.');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = async () => {
      clearInterval(recordingIntervalRef.current);
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

      if (recordingTime < 1) {
        setIsRecording(false);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        onSendMessage(reader.result, {
          type: 'voice',
          metadata: {
            duration: recordingTime,
            waveform: Array(20).fill(0).map(() => Math.random() * 0.8 + 0.2),
          },
        });
      };
      reader.readAsDataURL(blob);

      setIsRecording(false);
      setRecordingTime(0);
    };

    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    clearInterval(recordingIntervalRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  };

  // Utility functions
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > 1200) { height = (height * 1200) / width; width = 1200; }
        if (height > 1200) { width = (width * 1200) / height; height = 1200; }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isRoomLocked = user?.settings?.lockedChats?.includes(currentRoom?._id);

  if (!currentRoom) {
    return (
      <div className="chat-window welcome-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <motion.div
          className="welcome-logo-container"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
        >
          <div className="welcome-logo-pulse" />
          <Logo size={100} animate={true} />
        </motion.div>
        
        <motion.div 
          className="welcome-content"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 style={{ color: 'var(--text-primary)' }}>PingMe</h1>
          <p style={{ color: 'var(--text-secondary)' }}>The ultimate real-time messaging experience with style and speed.</p>
        </motion.div>
 
        <motion.div 
          className="feature-pills"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <div className="feature-pill purple" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <span>🔒</span> End-to-End Encrypted
          </div>
          <div className="feature-pill blue" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <span>⚡</span> Real-time Sync
          </div>
          <div className="feature-pill green" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <span>🖼️</span> HD Media Support
          </div>
        </motion.div>
 
        <motion.div 
          className="welcome-arrow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Select a chat to start
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </motion.div>
      </div>
    );
  }

  if (isRoomLocked && !isUnlocked) {
    return (
      <div className="chat-window locked-state">
        <motion.div 
          className="locked-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10, 10, 10, 0.8)',
            backdropFilter: 'blur(20px)',
            zIndex: 100
          }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            style={{ textAlign: 'center' }}
          >
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔒</div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', color: 'white' }}>This Chat is Locked</h3>
            <p style={{ color: '#94A3B8', marginTop: '8px', marginBottom: '32px' }}>Enter your PIN to view messages</p>
            <button 
              onClick={() => setShowLockModal(true)}
              style={{
                padding: '12px 32px',
                background: '#00a884',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 10px 20px rgba(0, 168, 132, 0.3)'
              }}
            >
              Unlock Chat
            </button>
          </motion.div>
        </motion.div>
        
        <ChatLockModal 
          isOpen={showLockModal}
          mode="verify"
          onVerify={() => setIsUnlocked(true)}
          onClose={() => setShowLockModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="chat-window" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <motion.div 
        className="chat-header" 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}
      >
        <button className="back-btn" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div 
          className="chat-header-info-clickable" 
          onClick={() => currentRoom.type === 'private' && setShowContactDrawer(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, cursor: currentRoom.type === 'private' ? 'pointer' : 'default' }}
        >
          <div className="chat-header-avatar-wrapper">
            <img src={roomAvatar} alt={roomName} className="chat-header-avatar" />
            {isOnline && <span className="online-dot pulse" />}
          </div>
          <div className="chat-header-info">
            <h3 className="chat-header-name" style={{ color: 'var(--text-primary)' }}>
              {roomName}
              {currentRoom.type === 'private' && <span style={{ marginLeft: '6px', fontSize: '14px', opacity: 0.5 }}>✏️</span>}
            </h3>
            <span className="chat-header-status" style={{ color: 'var(--text-secondary)' }}>
              {currentRoom.type === 'group' ? (
                `${memberCount} members`
              ) : isOnline ? (
                <span className="status-online">Online</span>
              ) : (
                formatLastSeen(otherMember?.lastSeen)
              )}
            </span>
          </div>
        </div>

        <div className="chat-header-actions" style={{ position: 'relative' }}>
          <button 
            className="header-action-btn" 
            onClick={() => setShowMoreActions(!showMoreActions)} 
            title="Options"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
          
          <AnimatePresence>
            {showMoreActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '6px',
                  zIndex: 1000,
                  minWidth: '180px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                }}
              >
                <button 
                  onClick={() => { setShowBackgroundPicker(true); setShowMoreActions(false); }}
                  style={{ width: '100%', padding: '10px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px' }}
                  className="more-action-hover"
                >
                  🎨 Change Wallpaper
                </button>
                <button 
                  onClick={() => { /* Handle Mute */ setShowMoreActions(false); }}
                  style={{ width: '100%', padding: '10px 12px', background: 'none', border: 'none', color: '#F8FAFC', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px' }}
                  className="more-action-hover"
                >
                  🔕 Mute Conversation
                </button>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                <button 
                  onClick={() => { /* Handle Block */ setShowMoreActions(false); }}
                  style={{ width: '100%', padding: '10px 12px', background: 'none', border: 'none', color: '#EF4444', fontSize: '13px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px' }}
                  className="more-action-hover"
                >
                  🚫 Block User
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Pinned message banner */}
      <AnimatePresence>
        {activePinned && (
          <motion.div
            className="pinned-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onClick={() => {
              if (pinnedMessages.length > 1) {
                setShowPinnedModal(true);
              } else {
                scrollToMessage(activePinned.message?._id);
              }
            }}
          >
            <span className="pinned-icon">📌</span>
            <div className="pinned-info">
              <span className="pinned-label">
                {pinnedMessages.length > 1 ? `Pinned Messages (${pinnedMessages.length})` : 'Pinned Message'}
              </span>
              <span className="pinned-preview">
                {activePinned.message?.content?.substring(0, 50) || 'Media message'}
              </span>
            </div>
            <button className="pinned-close" onClick={(e) => {
              e.stopPropagation();
              onUnpin?.(activePinned.message?._id);
            }}>×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* E2E indicator (shown once at top) */}
      <div className="e2e-indicator">
        🔒 Messages are end-to-end encrypted
      </div>

      {/* Messages */}
      <div
        id="pingme-chat-area"
        data-messages="true"
        className="chat-messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          transition: 'all 0.3s ease'
        }}
      >
        {loadingMessages && <MessagesSkeleton />}

        {hasMoreMessages && !loadingMessages && (
          <div className="load-more">
            <button onClick={onLoadMore} className="load-more-btn">
              Load older messages
            </button>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <div key={message._id} id={`msg-${message._id}`} className={highlightedMsg === message._id ? 'msg-highlighted' : ''}>
              <MessageBubble
                message={message}
                isOwn={message.sender?._id === user?._id}
                onEdit={handleEdit}
                onDelete={onDeleteMessage}
                onReply={(msg) => onReply?.(msg)}
                onReaction={onReaction}
                onPin={onPin}
                onScrollToMessage={scrollToMessage}
                showAvatar={
                  index === messages.length - 1 ||
                  messages[index + 1]?.sender?._id !== message.sender?._id
                }
                userId={user?._id}
                isStarred={user?.starredMessages?.includes(message._id)}
                onStar={async (id) => {
                  try {
                    await axiosInstance.post(`/api/chats/message/${id}/star`);
                    setUser(prev => ({ ...prev, starredMessages: [...(prev.starredMessages || []), id] }));
                  } catch (err) { console.error(err); }
                }}
                onUnstar={async (id) => {
                  try {
                    await axiosInstance.delete(`/api/chats/message/${id}/star`);
                    setUser(prev => ({ ...prev, starredMessages: prev.starredMessages.filter(sid => sid !== id) }));
                  } catch (err) { console.error(err); }
                }}
                onForward={(msg) => {
                  setForwardingMessage(msg);
                  setShowForwardModal(true);
                }}
                isGroupChat={currentRoom?.type === 'group'}
              />
            </div>
          ))}
        </AnimatePresence>

        {typingUser && <TypingIndicator username={typingUser.username} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Upload progress */}
      <AnimatePresence>
        {uploadProgress !== null && (
          <motion.div className="upload-progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className="progress-text">{uploadProgress}%</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="chat-input-container">
        {isBlocked ? (
          <div className="blocked-banner" style={{ textAlign: 'center', color: '#ef4444', padding: '16px', fontWeight: 'bold', width: '100%', background: 'rgba(239,68,68,0.1)', borderRadius: '12px' }}>
            You have blocked this user. Unblock to send messages.
          </div>
        ) : (
          <>
            {/* Reply bar */}
            <AnimatePresence>
          {replyingTo && (
            <motion.div
              className="reply-bar"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="reply-bar-content">
                <span className="reply-bar-name">{replyingTo.sender?.username}</span>
                <span className="reply-bar-text">{replyingTo.content?.substring(0, 60) || `📎 ${replyingTo.type}`}</span>
              </div>
              <button className="reply-bar-close" onClick={onCancelReply}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editing bar */}
        <AnimatePresence>
          {editingMessage && (
            <motion.div
              className="editing-bar"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="editing-info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                <span>Editing message</span>
              </div>
              <button className="cancel-edit-btn" onClick={handleCancelEdit}>Cancel</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Templates panel */}
        <AnimatePresence>
          {showTemplates && (
            <motion.div
              className="templates-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <div className="templates-header">
                <span>Quick Replies</span>
                <button onClick={() => setShowTemplates(false)}>×</button>
              </div>
              <div className="templates-grid">
                {DEFAULT_TEMPLATES.map((t, i) => (
                  <button
                    key={i}
                    className="template-chip"
                    onClick={() => { setInputValue(t); setShowTemplates(false); }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="chat-input-container" style={{ position: 'relative' }}>
          {/* Attachment Grid Popup */}
          <AnimatePresence>
            {showAttachMenu && (
              <motion.div
                className="attachment-menu-popup"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                style={{
                  position: 'absolute',
                  bottom: '68px',
                  left: '8px',
                  width: '280px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  padding: '16px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                  zIndex: 200
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Share</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {[
                    { label: 'Camera', icon: '📷', bg: '#FEF3C7', ref: cameraRef },
                    { label: 'Photos', icon: '🖼️', bg: '#EDE9FE', ref: photoRef },
                    { label: 'Video', icon: '🎬', bg: '#FEE2E2', ref: videoRef },
                    { label: 'Audio', icon: '🎵', bg: '#DCFCE7', ref: audioRef },
                    { label: 'Document', icon: '📄', bg: '#DBEAFE', ref: docRef }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      className="attach-grid-btn"
                      onClick={() => { 
                        if (opt.label === 'Camera') {
                          openCamera();
                        } else {
                          opt.ref.current?.click(); 
                        }
                        setShowAttachMenu(false); 
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '12px 8px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: 'none',
                        background: 'var(--bg-surface)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', background: opt.bg }}>
                        {opt.icon}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Emoji Picker Popup */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                style={{ position: 'absolute', bottom: '64px', left: '50px', zIndex: 200 }}
              >
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    setInputValue(prev => prev + emojiData.emoji);
                    chatInputRef.current?.focus();
                  }}
                  theme={document.documentElement.classList.contains('light-mode') ? 'light' : 'dark'}
                  width={300}
                  height={400}
                  searchDisabled={false}
                  skinTonesDisabled
                  previewConfig={{ showPreview: false }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="input-actions-left">
            <motion.button
              className="attach-btn"
              onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmojiPicker(false); }}
              animate={{ rotate: showAttachMenu ? 45 : 0 }}
              style={{ background: 'var(--bg-surface)', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}
              title="Attach"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.82-2.82l8.49-8.49" />
              </svg>
            </motion.button>
            <button
               className="template-btn"
               onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachMenu(false); }}
               title="Emoji"
               style={{ fontSize: '22px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', color: showEmojiPicker ? 'var(--accent)' : 'var(--text-muted)' }}
             >
              😊
            </button>
            <button className="template-btn" onClick={() => setShowTemplates(!showTemplates)} title="Quick Replies">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </button>
          </div>

          <div className="chat-input-wrapper">
            {isRecording ? (
              <div className="recording-ui" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="recording-dot" style={{ width: '8px', height: '8px', background: '#ff2e74', borderRadius: '50%' }} />
                <span className="recording-time" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>
                  {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                </span>
                <div className="recording-placeholder" style={{ flex: 1, color: 'var(--text-muted)', fontSize: '14px' }}>Recording...</div>
                <button className="cancel-rec-btn" onClick={cancelRecording} style={{ background: 'none', border: 'none', color: '#ff2e74', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Cancel</button>
              </div>
            ) : uploading ? (
              <div className="upload-progress-container" style={{ flex: 1, position: 'relative', background: 'var(--bg-secondary)', borderRadius: '12px', overflow: 'hidden', padding: '12px', display: 'flex', alignItems: 'center' }}>
                <motion.div 
                  initial={{ width: 0, left: '-100%' }} 
                  animate={{ left: '100%' }} 
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} 
                  style={{ position: 'absolute', top: 0, width: '50%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(124, 58, 237, 0.4), transparent)' }} 
                />
                <span className="upload-text" style={{ position: 'relative', zIndex: 1, color: 'var(--accent)', fontWeight: '600', fontSize: '13px' }}>Sending file... please wait</span>
              </div>
            ) : (
              <textarea
                ref={chatInputRef}
                className="chat-input"
                placeholder="Type a message..."
                rows="1"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowEmojiPicker(false)}
                style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
            )}
          </div>

          <div className="input-actions-right">
            <AnimatePresence mode="wait">
              {isRecording ? (
                <motion.button 
                  key="stop"
                  className="send-btn" 
                  onClick={stopRecording} 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  title="Stop recording"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="16" />
                  </svg>
                </motion.button>
              ) : (inputValue.trim() || uploading) ? (
                <motion.button
                  key="send"
                  className="send-btn"
                  onClick={handleSend}
                  disabled={uploading}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  title="Send message"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </motion.button>
              ) : (
                <motion.button
                  key="voice"
                  className="send-btn"
                  onClick={startRecording}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  title="Voice message"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Hidden File Inputs */}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handleCameraCapture} />
          <input ref={photoRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={handlePhotoSelect} />
          <input ref={videoRef} type="file" accept="video/*" style={{display:'none'}} onChange={handleVideoSelect} />
          <input ref={audioRef} type="file" accept="audio/*" style={{display:'none'}} onChange={handleAudioSelect} />
          <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx" style={{display:'none'}} onChange={handleDocSelect} />
        </div>
        </>
        )}
      </div>

      {/* Pinned messages modal */}
      <AnimatePresence>
        {showPinnedModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPinnedModal(false)}
          >
            <motion.div
              className="pinned-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Pinned Messages</h3>
              {pinnedMessages.map((p, i) => (
                <div key={i} className="pinned-modal-item">
                  <div className="pinned-modal-content">
                    <strong>{p.message?.sender?.username}</strong>
                    <p>{p.message?.content?.substring(0, 100) || 'Media'}</p>
                  </div>
                  <button onClick={() => {
                    onUnpin?.(p.message?._id);
                    if (pinnedMessages.length <= 1) setShowPinnedModal(false);
                  }}>Unpin</button>
                </div>
              ))}
              <button className="modal-close-btn" onClick={() => setShowPinnedModal(false)}>Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScheduleModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowScheduleModal(false)}
            style={{ zIndex: 100 }}
          >
            <motion.div
              className="pinned-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <h3>Schedule Message</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                Pick a future time to send the currently typed message.
              </p>
              <input 
                type="datetime-local" 
                value={scheduleDate} 
                onChange={e => setScheduleDate(e.target.value)} 
                min={new Date().toISOString().slice(0, 16)}
                style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', borderRadius: '12px', marginBottom: '16px' }} 
              />
              <button 
                className="submit-btn" 
                onClick={handleScheduleSend}
                disabled={!inputValue.trim()}
              >
                Schedule "{inputValue.substring(0,20)}{inputValue.length > 20 ? '...' : ''}"
              </button>
              <button className="cancel-edit-btn" onClick={() => setShowScheduleModal(false)} style={{ marginTop: '12px', width: '100%' }}>Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewFile(null)}
            style={{ zIndex: 100 }}
          >
            <motion.div
              className="pinned-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <h3>File Preview</h3>
              <div style={{ background: 'var(--bg-primary)', borderRadius: '12px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                {previewFile.type === 'image' ? (
                  <img src={previewFile.url} alt="preview" style={{ maxHeight: '300px', maxWidth: '100%', objectFit: 'contain' }} />
                ) : (
                  <video src={previewFile.url} controls style={{ maxHeight: '300px', maxWidth: '100%' }} />
                )}
              </div>
              <input
                type="text"
                placeholder="Add a caption..."
                value={fileCaption}
                onChange={e => setFileCaption(e.target.value)}
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: '8px', color: 'var(--text-primary)' }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button className="cancel-edit-btn" onClick={() => setPreviewFile(null)}>Cancel</button>
                <button className="save-settings-btn" onClick={handleConfirmPreview}>Send</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ContactProfileDrawer 
        contact={otherMember}
        isOpen={showContactDrawer}
        onClose={() => setShowContactDrawer(false)}
      />
      <ChatLockModal 
        isOpen={showLockModal}
        mode="verify"
        onVerify={() => setIsUnlocked(true)}
        onClose={() => setShowLockModal(false)}
      />
      <WallpaperModal 
        isOpen={showBackgroundPicker}
        onClose={() => setShowBackgroundPicker(false)}
        axiosInstance={axiosInstance}
        user={user}
      />

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBottom && (
          <motion.button
            className="scroll-bottom-btn"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={() => scrollToBottom()}
            style={{
              position: 'absolute',
              bottom: '100px',
              right: '20px',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#1A1A1A',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/>
            </svg>
            {newMessagesWhileScrolled > 0 && (
              <span className="unread-badge" style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#A855F7',
                color: 'white',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 6px',
                borderRadius: '10px',
                border: '2px solid #1A1A1A'
              }}>
                {newMessagesWhileScrolled > 9 ? '9+' : newMessagesWhileScrolled}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {forwardingMessage && (
        <ForwardModal 
          isOpen={showForwardModal}
          onClose={() => { setShowForwardModal(false); setForwardingMessage(null); }}
          message={forwardingMessage}
          rooms={rooms}
          currentUser={user}
          onForward={async (mid, rids) => {
            await axiosInstance.post('/api/chats/forward', { messageId: mid, roomIds: rids });
          }}
        />
      )}

      {/* Camera Live View Modal */}
      <AnimatePresence>
        {showCameraView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 10000, display: 'flex', flexDirection: 'column' }}
          >
            <button onClick={stopCamera} style={{ position: 'absolute', top: '24px', left: '24px', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', fontSize: '24px', width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer', zIndex: 10 }}>✕</button>
            <video 
              ref={cameraVideoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ flex: 1, objectFit: 'cover', width: '100%' }} 
            />
            <div style={{ position: 'absolute', bottom: '0', width: '100%', padding: '32px', display: 'flex', justifyContent: 'center', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
              <button 
                onClick={capturePhoto} 
                style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'transparent', border: '4px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'white' }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
