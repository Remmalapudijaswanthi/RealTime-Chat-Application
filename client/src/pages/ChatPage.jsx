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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const [appLoaded, setAppLoaded] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [goToMessageId, setGoToMessageId] = useState(null);
  const chat = useChat();
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => setAppLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Browser title with unread count AND apply settings
  useEffect(() => {
    if (user) {
      const totalUnread = Object.values(chat.unreadCounts).reduce((a, b) => a + b, 0);
      
      // Update Tab Title
      let display = totalUnread;
      if (totalUnread > 99) display = '99+';
      
      document.title = totalUnread > 0
        ? `(${display}) PingMe • ${user.username}`
        : `PingMe • ${user.username}`;

      // Update Favicon Badge
      const updateFavicon = (count) => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        img.src = '/pingme-logo.svg'; // Ensure this matches your logo path
        img.onload = () => {
          ctx.clearRect(0, 0, 32, 32);
          ctx.drawImage(img, 0, 0, 28, 28);
          
          if (count > 0) {
            // Background red circle
            ctx.beginPath();
            ctx.arc(24, 8, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#EF4444';
            ctx.fill();
            
            // Text white number
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Inter, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              count > 9 ? '9+' : String(count),
              24, 8
            );
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
        
      // Apply background and wallpaper
      if (user.settings?.appBackground) {
        document.documentElement.style.setProperty('--bg-primary', user.settings.appBackground);
      }
      if (user.settings?.chatWallpaper && user.settings.chatWallpaper !== 'default') {
        const wp = user.settings.chatWallpaper;
        let bgImage = 'none';
        if (wp === 'dots') bgImage = 'radial-gradient(#2A2A2A 1px, transparent 1px)';
        if (wp === 'grid') bgImage = 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)';
        document.documentElement.style.setProperty('--chat-bg-image', bgImage);
      } else {
        document.documentElement.style.setProperty('--chat-bg-image', 'none');
      }
    }
    return () => { document.title = 'PingMe'; };
  }, [user, chat.unreadCounts]);

  // Listen for Starred Messages open event
  useEffect(() => {
    const handleOpenStarred = () => setShowStarred(true);
    window.addEventListener('openStarredMessages', handleOpenStarred);
    return () => window.removeEventListener('openStarredMessages', handleOpenStarred);
  }, []);

  const handleSelectRoom = (room) => {
    chat.selectRoom(room);
    setMobileSidebarOpen(false);
  };

  const handleBackToSidebar = () => {
    setMobileSidebarOpen(true);
  };

  const handleSendMessage = (content, options = {}) => {
    chat.sendMessage(content, options);
  };

  const handleGoToMessage = async (roomId, messageId) => {
    setShowStarred(false);
    
    // Find room object from chat.rooms
    const room = chat.rooms.find(r => r._id === roomId);
    if (!room) return;

    // Select room
    await chat.selectRoom(room);
    
    // Set message ID to highlight/scroll
    setGoToMessageId(messageId);
    
    // Reset after some time
    setTimeout(() => setGoToMessageId(null), 3000);
  };

  return (
    <motion.div
      className="chat-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`chat-layout ${mobileSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: appLoaded ? 0 : -100, opacity: appLoaded ? 1 : 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
          style={{ height: '100%', flex: 1 }}
        >
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
          />
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
