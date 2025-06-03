import { GameObjects, Scene } from "phaser";

import { EventBus } from "../EventBus";

const dpr = window.devicePixelRatio;
export class MainMenu extends Scene {
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;
    logoTween: Phaser.Tweens.Tween | null;

    constructor() {
        super("MainMenu");
    }

    create() {
        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        const book = this.add.image(centerX, centerY-80, "book");

        book.setScale(0.333 * dpr);
        book.setOrigin(0.5);
        book.setInteractive();
        book.on("pointerdown", () => {
             EventBus.emit("click", this);
        });

        EventBus.emit("current-scene-ready", this);
    }
}
