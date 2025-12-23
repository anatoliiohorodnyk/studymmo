import { create } from 'zustand';
import { api } from '@/lib/api';
import { Character, StudyResult } from '@/types/api';
import { useDebugStore } from './debugStore';

interface CharacterState {
  character: Character | null;
  isLoading: boolean;
  error: string | null;
  cooldownUntil: number;
  lastStudyResult: StudyResult | null;

  loadCharacter: () => Promise<void>;
  refreshCharacter: () => Promise<void>;
  study: () => Promise<StudyResult>;
  clearError: () => void;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  character: null,
  isLoading: false,
  error: null,
  cooldownUntil: 0,
  lastStudyResult: null,

  loadCharacter: async () => {
    try {
      set({ isLoading: true, error: null });
      const character = await api.getCharacter();
      set({ character, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  refreshCharacter: async () => {
    try {
      const character = await api.getCharacter();
      set({ character });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  study: async () => {
    const { cooldownUntil } = get();
    const cooldownDisabled = useDebugStore.getState().cooldownDisabled;
    if (!cooldownDisabled && Date.now() < cooldownUntil) {
      throw new Error('Study is on cooldown');
    }

    try {
      set({ error: null });
      const result = await api.study();

      // Update immediate state for responsiveness
      set((state) => {
        if (!state.character) return state;

        const updatedSubjects = state.character.subjects.map((subject) => {
          const gain = result.subjectXpGains.find(
            (g: any) => g.subjectId === subject.subjectId,
          );
          if (gain) {
            return {
              ...subject,
              level: gain.newLevel,
              currentXp: gain.newXp,
            };
          }
          return subject;
        });

        return {
          character: {
            ...state.character,
            level: result.newCharacterLevel,
            totalXp: result.newCharacterXp,
            cash: result.newCash,
            studyClicksInCurrentClass: result.studyClicksInCurrentClass,
            subjects: updatedSubjects,
          },
          cooldownUntil: result.cooldownUntil,
          lastStudyResult: result,
        };
      });

      // Refresh full character data to get updated nextLocation info
      get().refreshCharacter();

      return result;
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
