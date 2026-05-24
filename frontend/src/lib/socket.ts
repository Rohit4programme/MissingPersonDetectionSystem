import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  connect(token?: string): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
    });

    // Re-register all existing listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on<T = any>(event: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    this.socket?.on(event, callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
      this.socket?.off(event, callback);
    };
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      this.socket?.off(event, callback);
    } else {
      this.listeners.delete(event);
      this.socket?.off(event);
    }
  }

  emit(event: string, data?: unknown): void {
    this.socket?.emit(event, data);
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get id(): string | undefined {
    return this.socket?.id;
  }
}

// Singleton instance
const socketService = new SocketService();

// Event name constants
export const SOCKET_EVENTS = {
  DETECTION_NEW: 'detection.new',
  DETECTION_VERIFIED: 'detection.verified',
  DETECTION_REJECTED: 'detection.rejected',
  ALERT_NEW: 'alert.new',
  ALERT_READ: 'alert.read',
  CASE_UPDATED: 'case.updated',
  CASE_STATUS_CHANGED: 'case.status_changed',
  SIGHTING_NEW: 'sighting.new',
  SIGHTING_VERIFIED: 'sighting.verified',
  CAMERA_STATUS: 'camera.status',
  USER_ACTIVITY: 'user.activity',
} as const;

export default socketService;
