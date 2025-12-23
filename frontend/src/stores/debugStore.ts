import { create } from 'zustand';
import { api } from '@/lib/api';

interface DebugState {
  cooldownDisabled: boolean;
  isLoaded: boolean;

  loadConfig: () => Promise<void>;
  toggleCooldown: () => Promise<boolean>;
}

export const useDebugStore = create<DebugState>((set, get) => ({
  cooldownDisabled: false,
  isLoaded: false,

  loadConfig: async () => {
    try {
      const config = await api.getDebugConfig();
      set({ cooldownDisabled: config.cooldownDisabled, isLoaded: true });
    } catch (err) {
      console.error('Failed to load debug config:', err);
    }
  },

  toggleCooldown: async () => {
    try {
      const result = await api.toggleCooldown();
      set({ cooldownDisabled: result.cooldownDisabled });
      return result.cooldownDisabled;
    } catch (err) {
      console.error('Failed to toggle cooldown:', err);
      return get().cooldownDisabled;
    }
  },
}));
