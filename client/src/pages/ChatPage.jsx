import { useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import GroupModal from '../components/GroupModal';
import { useChat } from '../hooks/useChat';

export default function ChatPage() {
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);
  const chat = useChat();

  const handleSelectRoom = (room) => {
    chat.selectRoom(room);
    setMobileSidebarOpen(false);
  };

  const handleBackToSidebar = () => {
    setMobileSidebarOpen(true);
  };

  return (
    <motion.div
      className="chat-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`chat-layout ${mobileSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Sidebar
          rooms={chat.rooms}
          currentRoom={chat.currentRoom}
          onSelectRoom={handleSelectRoom}
          onNewGroup={() => setShowGroupModal(true)}
          onCreateRoom={chat.createRoom}
          loadingRooms={chat.loadingRooms}
          unreadCounts={chat.unreadCounts}
          typingUsers={chat.typingUsers}
        />
        <ChatWindow
          currentRoom={chat.currentRoom}
          messages={chat.messages}
          onSendMessage={chat.sendMessage}
          onEditMessage={chat.editMessage}
          onDeleteMessage={chat.deleteMessage}
          onStartTyping={chat.startTyping}
          onStopTyping={chat.stopTyping}
          typingUsers={chat.typingUsers}
          loadingMessages={chat.loadingMessages}
          hasMoreMessages={chat.hasMoreMessages}
          onLoadMore={chat.loadMoreMessages}
          onBack={handleBackToSidebar}
        />
      </div>

      {showGroupModal && (
        <GroupModal
          onClose={() => setShowGroupModal(false)}
          onCreateGroup={chat.createGroup}
        />
      )}
    </motion.div>
  );
}
