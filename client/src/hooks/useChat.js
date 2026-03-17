import { useState, useCallback, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export function useChat() {
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [page, setPage] = useState(1);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  
  // Contacts specific state
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  const { socket } = useSocket();
  const { user } = useAuth();

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    try {
      setLoadingRooms(true);
      const res = await axiosInstance.get('/api/chats/rooms');
      setRooms(res.data);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    try {
      setLoadingContacts(true);
      const res = await axiosInstance.get('/api/users/contacts');
      setContacts(res.data);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  // Fetch messages for a room
  const fetchMessages = useCallback(async (roomId, pageNum = 1) => {
    try {
      setLoadingMessages(true);
      const res = await axiosInstance.get(
        `/api/chats/room/${roomId}/messages?page=${pageNum}&limit=20`
      );
      if (pageNum === 1) {
        setMessages(res.data.messages);
      } else {
        setMessages((prev) => [...res.data.messages, ...prev]);
      }
      setHasMoreMessages(pageNum < res.data.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Load more messages (scroll up)
  const loadMoreMessages = useCallback(async () => {
    if (!currentRoom || !hasMoreMessages || loadingMessages) return;
    await fetchMessages(currentRoom._id, page + 1);
  }, [currentRoom, hasMoreMessages, loadingMessages, page, fetchMessages]);

  // Select a room
  const selectRoom = useCallback(
    async (room) => {
      if (currentRoom?._id === room._id) return;

      setCurrentRoom(room);
      setMessages([]);
      setPage(1);
      setHasMoreMessages(true);

      await fetchMessages(room._id);

      // Join room via socket
      if (socket) {
        socket.emit('join_room', room._id);
        socket.emit('mark_read', { roomId: room._id });
      }

      // Clear unread count
      setUnreadCounts((prev) => ({ ...prev, [room._id]: 0 }));
    },
    [currentRoom, socket, fetchMessages]
  );

  // Send message (supports text, image, file)
  const sendMessage = useCallback(
    (content, type = 'text', fileName = null, fileSize = null) => {
      if (!socket || !currentRoom) return;
      if (type === 'text' && !content.trim()) return;
      const payload = { roomId: currentRoom._id, content, type };
      if (fileName) payload.fileName = fileName;
      if (fileSize) payload.fileSize = fileSize;
      socket.emit('send_message', payload);
    },
    [socket, currentRoom]
  );

  // Edit message
  const editMessage = useCallback(async (messageId, content) => {
    try {
      const res = await axiosInstance.patch(`/api/chats/message/${messageId}`, {
        content,
      });
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? res.data : msg))
      );
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  }, []);

  // Delete message (For Me or For Everyone)
  const deleteMessage = useCallback(async (messageId, type = 'me') => {
    try {
      if (type === 'everyone') {
        await axiosInstance.patch(`/api/chats/message/${messageId}/delete`);
        setMessages((prev) => prev.map((msg) => 
          msg._id === messageId ? { ...msg, deletedForEveryone: true, content: 'This message was deleted', type: 'text' } : msg
        ));
      } else {
        await axiosInstance.delete(`/api/chats/message/${messageId}`);
        setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      }
      
      // Notify via socket to update other clients immediately for "everyone"
      if (type === 'everyone' && socket && currentRoom) {
         socket.emit('message_deleted_everyone', { roomId: currentRoom._id, messageId });
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  }, [socket, currentRoom]);

  // Create or get private room
  const createRoom = useCallback(
    async (userId) => {
      try {
        const res = await axiosInstance.post('/api/chats/room', { userId });
        const room = res.data;

        // Add to rooms list if not already there
        setRooms((prev) => {
          const exists = prev.find((r) => r._id === room._id);
          if (exists) return prev;
          return [room, ...prev];
        });

        // Also refresh contacts since auto-add might happen
        fetchContacts();

        await selectRoom(room);
        return room;
      } catch (error) {
        console.error('Failed to create room:', error);
      }
    },
    [selectRoom, fetchContacts]
  );

  // Create group room
  const createGroup = useCallback(
    async (name, memberIds) => {
      try {
        const res = await axiosInstance.post('/api/chats/group', {
          name,
          members: memberIds,
        });
        const room = res.data;
        setRooms((prev) => [room, ...prev]);
        await selectRoom(room);
        return room;
      } catch (error) {
        console.error('Failed to create group:', error);
      }
    },
    [selectRoom]
  );

  // Delete Chat Room
  const deleteChat = useCallback(async (roomId) => {
    try {
      await axiosInstance.delete(`/api/chats/room/${roomId}`);
      setRooms((prev) => prev.filter((r) => r._id !== roomId));
      if (currentRoom?._id === roomId) {
        setCurrentRoom(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
      throw error;
    }
  }, [currentRoom]);

  // Remove Contact
  const removeContact = useCallback(async (userId) => {
    try {
      await axiosInstance.delete(`/api/users/contacts/${userId}`);
      setContacts((prev) => prev.filter((c) => c._id !== userId));
      // Optionally also remove the room from the list if desired, but instruction 
      // says "close open chat window" which we can do here:
      if (currentRoom?.members?.some((m) => m._id === userId && currentRoom.type === 'private')) {
        setCurrentRoom(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to remove contact:', error);
      throw error;
    }
  }, [currentRoom]);

  // Typing events
  const startTyping = useCallback(() => {
    if (socket && currentRoom) {
      socket.emit('typing', { roomId: currentRoom._id });
    }
  }, [socket, currentRoom]);

  const stopTyping = useCallback(() => {
    if (socket && currentRoom) {
      socket.emit('stop_typing', { roomId: currentRoom._id });
    }
  }, [socket, currentRoom]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      if (currentRoom && message.room === currentRoom._id) {
        setMessages((prev) => [...prev, message]);
        // Mark as read since we're in the room
        socket.emit('mark_read', { roomId: currentRoom._id });
      } else {
        // Increment unread count
        setUnreadCounts((prev) => ({
          ...prev,
          [message.room]: (prev[message.room] || 0) + 1,
        }));
      }

      // Update room's last message
      setRooms((prev) =>
        prev
          .map((room) =>
            room._id === message.room
              ? { ...room, lastMessage: message, updatedAt: new Date().toISOString() }
              : room
          )
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
    };

    const handleUserTyping = ({ userId, username, roomId }) => {
      if (userId === user?._id) return;
      setTypingUsers((prev) => ({
        ...prev,
        [roomId]: { userId, username },
      }));
    };

    const handleStopTyping = ({ userId, roomId }) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        if (updated[roomId]?.userId === userId) {
          delete updated[roomId];
        }
        return updated;
      });
    };

    const handleMessageRead = ({ roomId, readBy }) => {
      if (currentRoom && roomId === currentRoom._id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender?._id === user?._id ? { ...msg, read: true } : msg
          )
        );
      }
    };

    const handleNewRoom = ({ roomId, message }) => {
      // Refresh rooms when a new room is created or a message is sent in a room not in list
      fetchRooms();
    };

    const handleMessageDeletedEveryone = ({ roomId, messageId }) => {
      if (currentRoom && roomId === currentRoom._id) {
        setMessages((prev) => prev.map((msg) =>
          msg._id === messageId 
            ? { ...msg, deletedForEveryone: true, content: 'This message was deleted', type: 'text' } 
            : msg
        ));
      }
      
      // Update room's last message if it's the one that was deleted
      setRooms((prev) =>
        prev.map((room) => {
          if (room._id === roomId && room.lastMessage?._id === messageId) {
            return {
              ...room,
              lastMessage: {
                ...room.lastMessage,
                deletedForEveryone: true,
                content: 'This message was deleted',
                type: 'text'
              }
            };
          }
          return room;
        })
      );
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('message_read', handleMessageRead);
    socket.on('new_room', handleNewRoom);
    socket.on('message_deleted_everyone', handleMessageDeletedEveryone);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('message_read', handleMessageRead);
      socket.off('new_room', handleNewRoom);
      socket.off('message_deleted_everyone', handleMessageDeletedEveryone);
    };
  }, [socket, currentRoom, user, fetchRooms]);

  // Fetch rooms on mount
  useEffect(() => {
    fetchRooms();
    fetchContacts();
  }, [fetchRooms, fetchContacts]);

  return {
    rooms,
    contacts,
    currentRoom,
    messages,
    loadingRooms,
    loadingContacts,
    loadingMessages,
    hasMoreMessages,
    typingUsers,
    unreadCounts,
    selectRoom,
    sendMessage,
    editMessage,
    deleteMessage,
    deleteChat,
    removeContact,
    createRoom,
    createGroup,
    startTyping,
    stopTyping,
    loadMoreMessages,
    fetchRooms,
    fetchContacts,
  };
}
