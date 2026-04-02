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
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);

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

  // Fetch pinned messages
  const fetchPinned = useCallback(async (roomId) => {
    try {
      const res = await axiosInstance.get(`/api/chats/room/${roomId}/pinned`);
      setPinnedMessages(res.data);
    } catch (error) {
      console.error('Failed to fetch pinned:', error);
    }
  }, []);

  // Select a room
  const selectRoom = useCallback(
    async (room) => {
      if (currentRoom?._id === room._id) return;

      setCurrentRoom(room);
      setMessages([]);
      setPage(1);
      setHasMoreMessages(true);
      setReplyingTo(null);

      await fetchMessages(room._id);
      await fetchPinned(room._id);

      // Join room via socket
      if (socket) {
        socket.emit('join_room', room._id);
        socket.emit('mark_read', { roomId: room._id });
      }

      // Clear unread count
      setUnreadCounts((prev) => ({ ...prev, [room._id]: 0 }));
    },
    [currentRoom, socket, fetchMessages, fetchPinned]
  );

  // Send message
  const sendMessage = useCallback(
    (content, options = {}) => {
      if (!socket || !currentRoom) return;
      if (!content.trim() && !options.type) return;

      const tempId = `temp-${Date.now()}`;
      const data = {
        roomId: currentRoom._id,
        content: content.trim(),
        type: options.type || 'text',
        fileName: options.fileName || '',
        fileSize: options.fileSize || '',
        metadata: options.metadata || null,
        tempId, // Send tempId to server
      };

      // Attach reply
      if (replyingTo) {
        data.replyTo = {
          messageId: replyingTo._id,
          content: replyingTo.content?.substring(0, 60) || '',
          senderName: replyingTo.sender?.username || '',
          type: replyingTo.type || 'text',
        };
      }

      // Optimistic Update
      const optimisticMsg = {
        _id: tempId,
        sender: {
          _id: user._id,
          username: user.username,
          avatar: user.avatar,
        },
        room: currentRoom._id,
        content: content.trim(),
        type: data.type,
        status: 'sending',
        createdAt: new Date().toISOString(),
        replyTo: data.replyTo,
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      socket.emit('send_message', data, (ack) => {
        if (ack && ack.success) {
          // Replace optimistic message with confirmed one
          setMessages((prev) =>
            prev.map((msg) => (msg._id === tempId ? ack.data : msg))
          );
        }
      });
      
      setReplyingTo(null);
    },
    [socket, currentRoom, replyingTo, user]
  );

  // Add reaction
  const addReaction = useCallback(
    (messageId, emoji) => {
      if (!socket || !currentRoom) return;
      socket.emit('add_reaction', {
        messageId,
        roomId: currentRoom._id,
        emoji,
      });
    },
    [socket, currentRoom]
  );

  // Pin / Unpin
  const pinMessage = useCallback(
    (messageId) => {
      if (!socket || !currentRoom) return;
      socket.emit('pin_message', { roomId: currentRoom._id, messageId });
    },
    [socket, currentRoom]
  );

  const unpinMessage = useCallback(
    (messageId) => {
      if (!socket || !currentRoom) return;
      socket.emit('unpin_message', { roomId: currentRoom._id, messageId });
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

  // Forward message
  const forwardMessage = useCallback(async (messageId, roomIds) => {
    try {
      const res = await axiosInstance.post('/api/chats/forward', {
        messageId,
        roomIds,
      });
      // Optionally fetch rooms to update last messages if needed, 
      // but socket will handle real-time updates for rooms.
      return res.data;
    } catch (error) {
      console.error('Failed to forward message:', error);
      throw error;
    }
  }, []);

  // Star / Unstar message
  const starMessage = useCallback(async (messageId) => {
    try {
      await axiosInstance.post(`/api/chats/message/${messageId}/star`);
      // Update local state or user context if needed
    } catch (error) {
      console.error('Failed to star message:', error);
      throw error;
    }
  }, []);

  const unstarMessage = useCallback(async (messageId) => {
    try {
      await axiosInstance.delete(`/api/chats/message/${messageId}/star`);
      // Update local state or user context if needed
    } catch (error) {
      console.error('Failed to unstar message:', error);
      throw error;
    }
  }, []);

  // Delete chat (logical)
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

  // Create or get private room
  const createRoom = useCallback(
    async (userId) => {
      try {
        const res = await axiosInstance.post('/api/chats/room', { userId });
        const room = res.data;

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
        setMessages((prev) => {
          const alreadyExists = prev.some((m) => m._id === message._id);
          if (alreadyExists) {
            console.log('Duplicate message ignored:', message._id);
            return prev;
          }
          return [...prev, message];
        });
        socket.emit('mark_read', { roomId: currentRoom._id });
      } else {
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

    const handleUserTyping = ({ userId: typingUserId, username, roomId }) => {
      if (typingUserId === user?._id) return;
      setTypingUsers((prev) => ({
        ...prev,
        [roomId]: { userId: typingUserId, username },
      }));
    };

    const handleStopTyping = ({ userId: typingUserId, roomId }) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        if (updated[roomId]?.userId === typingUserId) {
          delete updated[roomId];
        }
        return updated;
      });
    };

    const handleMessageRead = ({ roomId }) => {
      if (currentRoom && roomId === currentRoom._id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender?._id === user?._id ? { ...msg, read: true } : msg
          )
        );
      }
    };

    const handleNewRoom = () => {
      fetchRooms();
    };

    const handleReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        )
      );
    };

    const handleMessagePinned = ({ roomId, pinnedMessages: pinned }) => {
      if (currentRoom && roomId === currentRoom._id) {
        setPinnedMessages(pinned);
      }
    };

    const handleMessageUnpinned = ({ roomId, pinnedMessages: pinned }) => {
      if (currentRoom && roomId === currentRoom._id) {
        setPinnedMessages(pinned);
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('message_read', handleMessageRead);
    socket.on('new_room', handleNewRoom);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('message_pinned', handleMessagePinned);
    socket.on('message_unpinned', handleMessageUnpinned);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('message_read', handleMessageRead);
      socket.off('new_room', handleNewRoom);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('message_pinned', handleMessagePinned);
      socket.off('message_unpinned', handleMessageUnpinned);
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
    pinnedMessages,
    replyingTo,
    setReplyingTo,
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
    addReaction,
    pinMessage,
    unpinMessage,
    forwardMessage,
    starMessage,
    unstarMessage,
    deleteChat,
  };
}
