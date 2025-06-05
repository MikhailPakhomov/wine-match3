import { create } from "zustand";

interface GameState {
  isGameLoaded: boolean;
  currentScene: Phaser.Scene | null;
  showMainMenuUI: boolean;

  setScene: (scene: Phaser.Scene) => void;
  setLoaded: (loaded: boolean) => void;
  setMainMenuUIVisible: (visible: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  isGameLoaded: false,
  currentScene: null,
  showMainMenuUI: false,

  setScene: (scene) => set({ currentScene: scene }),
  setLoaded: (loaded) => set({ isGameLoaded: loaded }),
  setMainMenuUIVisible: (visible) => set({ showMainMenuUI: visible }),
}));