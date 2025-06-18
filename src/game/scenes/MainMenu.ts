import { useGameStore } from "./../../store/useGameStore";
import { GameObjects, Scene } from "phaser";
import { LevelConfig, levelConfigs } from "../levels/levelConfig";

const dpr = window.devicePixelRatio || 1;
export class MainMenu extends Scene {
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;

    constructor() {
        super("MainMenu");
    }

    startLevel(config?: LevelConfig) {
        useGameStore.getState().setMainMenuUIVisible(false);

        this.scene.start("Game", {
            config: useGameStore.getState().levelConfig,
        });
        console.log(useGameStore.getState().levelConfig);
    }

    preload() {
        this.load.image("background", "assets/images/bg_main.png");
    }

    create() {
        const bg = this.add.image(0, 0, "background").setOrigin(0.5, 0.5);

        bg.setPosition(this.cameras.main.centerX, this.cameras.main.centerY);

        const scaleY = this.cameras.main.height / bg.height;
        bg.setScale(scaleY+0.1);

        bg.setScrollFactor(0);

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        const logo = this.add.image(centerX, centerY-100*dpr, "logo");
        logo.setScale(0.333 * dpr);
        logo.setOrigin(0.5);

        const book = this.add.image(
            centerX + 10 * dpr,
            this.cameras.main.height - 350 * dpr,
            "book"
        );

        book.setScale(0.333 * dpr);
        book.setOrigin(0.5);
        book.setInteractive();

        useGameStore.getState().setScene(this);
        useGameStore.getState().setLoaded(true);
        useGameStore.getState().setMainMenuUIVisible(true);
    }
}
