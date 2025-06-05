type BridgeEvents = {
  onGameLoaded?: (scene: Phaser.Scene) => void;
  onStartLevel?: () => void;
  onMainMenuUIVisible?: (visible: boolean) => void;
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

  triggerGameLoaded(scene: Phaser.Scene) {
    listeners.onGameLoaded?.(scene);
  },

  triggerStartLevel() {
    listeners.onStartLevel?.();
  },

  triggerMainMenuUIVisible(visible: boolean) {
    listeners.onMainMenuUIVisible?.(visible);
  }
};
