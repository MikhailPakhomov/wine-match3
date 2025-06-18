import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { LevelConfig, levelConfigs } from "../game/levels/levelConfig";

export interface Booster {
    type: string;
    count: number;
}
interface GameState {
    isGameLoaded: boolean;
    currentScene: Phaser.Scene | null;
    showMainMenuUI: boolean;
    scoreCount: number;

    levelConfig: LevelConfig;

    remainingMoves: number;
    goalsProgress: { type: string; count: number }[];

    profile: {
        boosters: Booster[];
        coins?: number;
    };

    setScene: (scene: Phaser.Scene) => void;
    setLoaded: (loaded: boolean) => void;
    setMainMenuUIVisible: (visible: boolean) => void;
    setScore: (score: number) => void;

    setLevelConfig: (levelConfig: LevelConfig) => void;

    initLevelState: (config: LevelConfig) => void;
    decreaseMoves: () => void;
    setMoves: (count: number) => void;
    updateGoal: (type: string, amount?: number) => void;
    setGoalCount: (type: string, count: number) => void;
    decreaseBoosterCount: (type: string) => void;
    increaseBoosterCount: (type: string, qty: number) => void;
}

export const useGameStore = create(
    subscribeWithSelector<GameState>((set) => ({
        profile: {
            boosters: [
                { type: "booster_glove", count: 4 },
                { type: "booster_hammer", count: 1 },
                { type: "booster_wand", count: 0 },
            ],
            coins: 1000,
        },
        isGameLoaded: false,
        currentScene: null,
        showMainMenuUI: false,
        scoreCount: 0,
        levelConfig: levelConfigs[12],
        remainingMoves: 0,
        goalsProgress: [],

        setScene: (scene) => set({ currentScene: scene }),
        setLoaded: (loaded) => set({ isGameLoaded: loaded }),
        setMainMenuUIVisible: (visible) => set({ showMainMenuUI: visible }),
        setScore: (score) =>
            set((state) => ({ scoreCount: state.scoreCount + score })),

        setLevelConfig: (levelConfig) => set({ levelConfig }),

        initLevelState: (config) =>
            set({
                levelConfig: config,
                remainingMoves: config.moves,
                goalsProgress: config.goals.map((goal) => ({ ...goal })),
            }),

        decreaseMoves: () =>
            set((state) => ({
                remainingMoves: Math.max(state.remainingMoves - 1, 0),
            })),

        setMoves: (count) => set({ remainingMoves: count }),

        updateGoal: (type, amount = 1) =>
            set((state) => ({
                goalsProgress: state.goalsProgress.map((goal) =>
                    goal.type === type
                        ? { ...goal, count: Math.max(goal.count - amount, 0) }
                        : goal
                ),
            })),

        setGoalCount: (type, count) =>
            set((state) => ({
                goalsProgress: state.goalsProgress.map((goal) =>
                    goal.type === type ? { ...goal, count } : goal
                ),
            })),

        decreaseBoosterCount: (type) =>
            set((state) => ({
                profile: {
                    boosters: state.profile.boosters.map((booster) =>
                        booster.type === type
                            ? {
                                  ...booster,
                                  count: Math.max(booster.count - 1, 0),
                              }
                            : booster
                    ),
                },
            })),
        increaseBoosterCount: (type, qty) =>
            set((state) => ({
                profile: {
                    boosters: state.profile.boosters.map((booster) =>
                        booster.type === type
                            ? {
                                  ...booster,
                                  count: booster.count + qty,
                              }
                            : booster
                    ),
                },
            })),
    }))
);
