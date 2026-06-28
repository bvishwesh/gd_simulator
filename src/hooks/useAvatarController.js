import { useRef, useCallback } from 'react';

export function useAvatarController() {
  const registry = useRef(new Map());

  const register = useCallback((seatIndex, controller) => {
    registry.current.set(seatIndex, controller);
    return () => {
      registry.current.delete(seatIndex);
    };
  }, []);

  const getController = useCallback((seatIndex) => {
    return registry.current.get(seatIndex) || null;
  }, []);

  const getAllControllers = useCallback(() => {
    return Array.from(registry.current.entries());
  }, []);

  const forEach = useCallback((fn) => {
    registry.current.forEach((controller, index) => {
      fn(controller, index);
    });
  }, []);

  return { register, getController, getAllControllers, forEach };
}
