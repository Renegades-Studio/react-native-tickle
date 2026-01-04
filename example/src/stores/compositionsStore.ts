import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Composition } from '../types/composer';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getZustandStorage } from 'src/utils/zustand';
import { createMMKV } from 'react-native-mmkv';

const mmkvStorage = createMMKV({
  id: 'ahap-composer-storage',
});
const zustandStorage = getZustandStorage(mmkvStorage);

interface CompositionsStore {
  compositions: Composition[];
  selectedCompositionId: string | null;
  createComposition: () => string;
  updateComposition: (id: string, events: Composition['events']) => void;
  deleteComposition: (id: string) => void;
  selectComposition: (id: string | null) => void;
  renameComposition: (id: string, name: string) => void;
  importComposition: (name: string, events: Composition['events']) => string;
}

export const useCompositionsStore = create<CompositionsStore>()(
  persist(
    (set, get) => {
      return {
        compositions: [],
        selectedCompositionId: null,

        createComposition: () => {
          const { compositions } = get();
          const count = compositions.length + 1;
          const newComposition: Composition = {
            id: Date.now().toString(),
            name: `Composition ${count}`,
            createdAt: Date.now(),
            events: [],
          };
          const newCompositions = [...compositions, newComposition];
          set({
            compositions: newCompositions,
            selectedCompositionId: newComposition.id,
          });
          return newComposition.id;
        },

        updateComposition: (id: string, events: Composition['events']) => {
          const { compositions } = get();
          const newCompositions = compositions.map((c) =>
            c.id === id ? { ...c, events } : c
          );
          set({ compositions: newCompositions });
        },

        deleteComposition: (id: string) => {
          const { compositions, selectedCompositionId } = get();
          const newCompositions = compositions.filter((c) => c.id !== id);
          set({
            compositions: newCompositions,
            selectedCompositionId:
              selectedCompositionId === id ? null : selectedCompositionId,
          });
        },

        selectComposition: (id: string | null) => {
          set({ selectedCompositionId: id });
        },

        renameComposition: (id: string, name: string) => {
          const { compositions } = get();
          const newCompositions = compositions.map((c) =>
            c.id === id ? { ...c, name } : c
          );
          set({ compositions: newCompositions });
        },

        importComposition: (name: string, events: Composition['events']) => {
          const { compositions } = get();
          const newComposition: Composition = {
            id: Date.now().toString(),
            name,
            createdAt: Date.now(),
            events,
          };
          const newCompositions = [...compositions, newComposition];
          set({
            compositions: newCompositions,
            selectedCompositionId: newComposition.id,
          });
          return newComposition.id;
        },
      };
    },
    {
      name: 'compositions',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ compositions: state.compositions }),
    }
  )
);

export function useCompositions() {
  return useCompositionsStore(
    useShallow((state) => ({
      compositions: state.compositions,
      selectedCompositionId: state.selectedCompositionId,
    }))
  );
}

export function useCompositionActions() {
  return useCompositionsStore((state) => ({
    createComposition: state.createComposition,
    updateComposition: state.updateComposition,
    deleteComposition: state.deleteComposition,
    selectComposition: state.selectComposition,
    renameComposition: state.renameComposition,
    importComposition: state.importComposition,
  }));
}
