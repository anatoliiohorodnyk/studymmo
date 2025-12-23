import { create } from 'zustand';
import { api } from '@/lib/api';
import { User } from '@/types/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
    cityId: string,
  ) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  error: null,

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      await api.login({ email, password });
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  register: async (email, username, password, cityId) => {
    try {
      set({ isLoading: true, error: null });
      await api.register({ email, username, password, cityId });
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    api.logout();
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    const token = api.getAccessToken();
    if (!token) {
      set({ isInitializing: false });
      return;
    }

    try {
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isInitializing: false });
    } catch {
      api.logout();
      set({ isInitializing: false });
    }
  },

  clearError: () => set({ error: null }),
}));
