import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import GroupModal from '../components/GroupModal';
import StarredMessages from '../components/StarredMessages';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';

export default function ChatPage() {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [appLoaded, setAppLoaded] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [goToMessageId, setGoToMessageId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showChat, setShowChat] = useState(false);
  
  const chat = useChat();
  const { user } = useAuth();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setAppLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Sync color mode from user settings
  useEffect(() => {
    const toggleColorMode = (mode) => {
      localStorage.setItem('pingme_color_mode', mode);
      if (mode === 'light') {
        document.documentElement.classList.add('light-mode');
        document.documentElement.classList.remove('dark-mode');
      } else {
        document.documentElement.classList.add('dark-mode');
        document.documentElement.classList.remove('light-mode');
      }
    };

    if (user?.settings?.colorMode) {
      const mode = user.settings.colorMode;
      localStorage.setItem('pingme_color_mode', mode);
      toggleColorMode(mode);
    }
  }, [user?._id, user?.settings?.colorMode]);

  // Browser title with unread count AND apply settings
  // ... (rest of the tab/favicon logic remains the same, but I'll update the background/wallpaper part to be more robust)
  useEffect(() => {
    if (user) {
      const totalUnread = Object.values(chat.unreadCounts).reduce((a, b) => a + b, 0);
      
      let display = totalUnread;
      if (totalUnread > 99) display = '99+';
      
      document.title = totalUnread > 0
        ? `(${display}) PingMe • ${user.username}`
        : `PingMe • ${user.username}`;

      const updateFavicon = (count) => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.src = '/pingme-logo.svg';
        img.onload = () => {
          ctx.clearRect(0, 0, 32, 32);
          ctx.drawImage(img, 0, 0, 28, 28);
          if (count > 0) {
            ctx.beginPath();
            ctx.arc(24, 8, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#EF4444';
            ctx.fill();
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Inter, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(count > 9 ? '9+' : String(count), 24, 8);
          }
          let link = document.querySelector("link[rel*='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = canvas.toDataURL();
        };
      };
      
      updateFavicon(totalUnread);
        
      if (user.settings?.appBackground) {
        document.documentElement.style.setProperty('--bg-primary', user.settings.appBackground);
      }
    }
    return () => { document.title = 'PingMe'; };
  }, [user, chat.unreadCounts]);

  useEffect(() => {
    const handleOpenStarred = () => setShowStarred(true);
    window.addEventListener('openStarredMessages', handleOpenStarred);
    return () => window.removeEventListener('openStarredMessages', handleOpenStarred);
  }, []);

  const handleSelectRoom = (room) => {
    chat.selectRoom(room);
    if (isMobile) setShowChat(true);
  };

  const handleBackToSidebar = () => {
    setShowChat(false);
  };

  const handleSendMessage = (content, options = {}) => {
    chat.sendMessage(content, options);
  };

  const handleGoToMessage = async (roomId, messageId) => {
    setShowStarred(false);
    const room = chat.rooms.find(r => r._id === roomId);
    if (!room) return;
    await chat.selectRoom(room);
    if (isMobile) setShowChat(true);
    setGoToMessageId(messageId);
    setTimeout(() => setGoToMessageId(null), 3000);
  };

  return (
    <motion.div
      className="chat-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`chat-layout`}>
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: appLoaded ? 0 : -100, opacity: appLoaded ? 1 : 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`sidebar ${isMobile && showChat ? 'hidden-mobile' : ''}`}
          style={{ height: '100%' }}
        >
          <Sidebar
            rooms={chat.rooms}
            currentRoom={chat.currentRoom}
            onSelectRoom={handleSelectRoom}
            onNewGroup={() => setShowGroupModal(true)}
            onCreateRoom={chat.createRoom}
            loadingRooms={chat.loadingRooms}
            unreadCounts={chat.unreadCounts}
            typingUsers={chat.typingUsers}
            onUnstar={chat.unstarMessage}
            onDeleteChat={chat.deleteChat}
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: appLoaded ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`chat-window ${isMobile && showChat ? 'visible-mobile' : ''}`}
          style={{ height: '100%', flex: 1 }}
        >
          {/* Hide welcome screen on mobile if no chat is selected (sidebar is showing) */}
          {(!isMobile || showChat) && (
            <ChatWindow
              currentRoom={chat.currentRoom}
              messages={chat.messages}
              rooms={chat.rooms}
              onSendMessage={handleSendMessage}
              onEditMessage={chat.editMessage}
              onDeleteMessage={chat.deleteMessage}
              onStartTyping={chat.startTyping}
              onStopTyping={chat.stopTyping}
              typingUsers={chat.typingUsers}
              loadingMessages={chat.loadingMessages}
              hasMoreMessages={chat.hasMoreMessages}
              onLoadMore={chat.loadMoreMessages}
              onBack={handleBackToSidebar}
              onReaction={chat.addReaction}
              onReply={chat.setReplyingTo}
              replyingTo={chat.replyingTo}
              onCancelReply={() => chat.setReplyingTo(null)}
              pinnedMessages={chat.pinnedMessages}
              onPin={chat.pinMessage}
              onUnpin={chat.unpinMessage}
              scrollToMessageId={goToMessageId}
              isMobile={isMobile}
              onShowSidebar={() => setShowChat(false)}
            />
          )}
        </motion.div>
      </div>

      {showStarred && (
        <StarredMessages 
          isOpen={showStarred}
          onClose={() => setShowStarred(false)}
          onGoToMessage={handleGoToMessage}
        />
      )}

      {showGroupModal && (
        <GroupModal
          onClose={() => setShowGroupModal(false)}
          onCreateGroup={chat.createGroup}
        />
      )}
    </motion.div>
  );
}
