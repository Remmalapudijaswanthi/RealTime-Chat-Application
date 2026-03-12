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

  // Send message
  const sendMessage = useCallback(
    (content) => {
      if (!socket || !currentRoom || !content.trim()) return;
      socket.emit('send_message', {
        roomId: currentRoom._id,
        content: content.trim(),
        type: 'text',
      });
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

  // Delete message
  const deleteMessage = useCallback(async (messageId) => {
    try {
      await axiosInstance.delete(`/api/chats/message/${messageId}`);
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }, []);

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

        await selectRoom(room);
        return room;
      } catch (error) {
        console.error('Failed to create room:', error);
      }
    },
    [selectRoom]
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

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('message_read', handleMessageRead);
    socket.on('new_room', handleNewRoom);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('message_read', handleMessageRead);
      socket.off('new_room', handleNewRoom);
    };
  }, [socket, currentRoom, user, fetchRooms]);

  // Fetch rooms on mount
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return {
    rooms,
    currentRoom,
    messages,
    loadingRooms,
    loadingMessages,
    hasMoreMessages,
    typingUsers,
    unreadCounts,
    selectRoom,
    sendMessage,
    editMessage,
    deleteMessage,
    createRoom,
    createGroup,
    startTyping,
    stopTyping,
    loadMoreMessages,
    fetchRooms,
  };
}
