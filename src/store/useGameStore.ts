import { create } from "zustand";

interface GameState {
    isGameLoaded: boolean;
    currentScene: Phaser.Scene | null;
    showMainMenuUI: boolean;

    scoreCount: number;

    setScene: (scene: Phaser.Scene) => void;
    setLoaded: (loaded: boolean) => void;
    setMainMenuUIVisible: (visible: boolean) => void;

    setScore: (score: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
    isGameLoaded: false,
    currentScene: null,
    showMainMenuUI: false,

    scoreCount: 0,

    setScene: (scene) => set({ currentScene: scene }),
    setLoaded: (loaded) => set({ isGameLoaded: loaded }),
    setMainMenuUIVisible: (visible) => set({ showMainMenuUI: visible }),

    setScore: (score) => set({ scoreCount: score }),
}));
