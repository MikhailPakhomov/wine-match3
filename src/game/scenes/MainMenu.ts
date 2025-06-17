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
            config: levelConfigs[12],
        });
    }

    preload() {
        this.load.image("background", "assets/images/bg.png");
    }

    create() {
        const bg = this.add.image(0, 0, "background").setOrigin(0.5, 0.5);

        
        bg.setPosition(this.cameras.main.centerX, this.cameras.main.centerY);

       
        const scaleY = this.cameras.main.height / bg.height;
        bg.setScale(scaleY);

        
        bg.setScrollFactor(0);

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        const book = this.add.image(centerX, centerY - 80, "book");

        book.setScale(0.333 * dpr);
        book.setOrigin(0.5);
        book.setInteractive();

        useGameStore.getState().setScene(this);
        useGameStore.getState().setLoaded(true);
        useGameStore.getState().setMainMenuUIVisible(true);
    }
}
