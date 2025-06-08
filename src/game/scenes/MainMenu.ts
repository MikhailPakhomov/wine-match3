import { GameObjects, Scene } from "phaser";
import { LevelConfig, levelConfigs } from "../levels/levelConfig";

import { EventBus } from "../EventBus";
import { bridge } from "../../bridge";

const dpr = window.devicePixelRatio;
export class MainMenu extends Scene {
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;

    constructor() {
        super("MainMenu");
    }

  startLevel(config?: LevelConfig) {

    bridge.triggerStartLevel();

    this.scene.start("Game", {
      config: levelConfigs[3],
    });
  }
    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        const book = this.add.image(centerX, centerY - 80, "book");

        book.setScale(0.333 * dpr);
        book.setOrigin(0.5);
        book.setInteractive();


       bridge.triggerGameLoaded(this);
    }
}
