import { create } from 'zustand';
import socket from '@/lib/socket';

interface SocketState {
  connected: boolean;
  notifications: any[];
}

interface SocketActions {
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  emit: (event: string, data?: any) => void;
  setConnected: (connected: boolean) => void;
  addNotification: (notification: any) => void;
  clearNotifications: () => void;
}

export const useSocketStore = create<SocketState & SocketActions>((set) => ({
  connected: false,
  notifications: [],

  on: (event: string, callback: (...args: any[]) => void) => {
    socket.on(event, callback);
  },

  off: (event: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  },

  emit: (event: string, data?: any) => {
    socket.emit(event, data);
  },

  setConnected: (connected: boolean) => set({ connected }),
  addNotification: (notification: any) =>
    set((state) => ({ notifications: [notification, ...state.notifications] })),
  clearNotifications: () => set({ notifications: [] }),
}));
