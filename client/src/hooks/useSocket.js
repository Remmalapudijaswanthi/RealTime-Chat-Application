import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

export function useSocketEvent(eventName, handler) {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);

  // Update ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket) return;

    const eventHandler = (...args) => handlerRef.current(...args);
    socket.on(eventName, eventHandler);

    return () => {
      socket.off(eventName, eventHandler);
    };
  }, [socket, eventName]);
}

export function useEmit() {
  const { socket } = useSocket();

  const emit = useCallback(
    (eventName, data) => {
      if (socket) {
        socket.emit(eventName, data);
      }
    },
    [socket]
  );

  return emit;
}
