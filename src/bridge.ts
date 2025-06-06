type BridgeEvents = {
    onGameLoaded?: (scene: Phaser.Scene) => void;
    onStartLevel?: () => void;
    onMainMenuUIVisible?: (visible: boolean) => void;
    onScoreUpdate?: (score: number) => void;
};

const listeners: BridgeEvents = {};

export const bridge = {
    setOnGameLoaded(cb: (scene: Phaser.Scene) => void) {
        listeners.onGameLoaded = cb;
    },

    setOnStartLevel(cb: () => void) {
        listeners.onStartLevel = cb;
    },

    setOnMainMenuUIVisible(cb: (visible: boolean) => void) {
        listeners.onMainMenuUIVisible = cb;
    },

    setOnScoreUpdate(cb: (score: number) => void) {
        listeners.onScoreUpdate = cb;
    },

    triggerGameLoaded(scene: Phaser.Scene) {
        listeners.onGameLoaded?.(scene);
    },

    triggerStartLevel() {
        listeners.onStartLevel?.();
    },

    triggerMainMenuUIVisible(visible: boolean) {
        listeners.onMainMenuUIVisible?.(visible);
    },
    triggerScoreUpdate(score: number) {
        listeners.onScoreUpdate?.(score);
    },
};
