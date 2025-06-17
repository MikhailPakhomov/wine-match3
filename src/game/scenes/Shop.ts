import { Scene } from "phaser";
import { useGameStore } from "../../store/useGameStore";

 const dpr = window.devicePixelRatio || 1;

export class Shop extends Scene {
    constructor() {
        super("Shop");
    }

    create() {
        this.cameras.main.setBackgroundColor('#ffffff');

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        const title = this.add.text(centerX, 20*dpr, "Магазин", {
            font: `700 ${24*dpr}px Roboto`,
            color: "#000000",
        });

        title.setOrigin(0.5);
        title.setResolution(dpr);

        const back = this.add.text(centerX, 50*dpr, "Назад", {
             font: `700 ${24*dpr}px Roboto`,
            color: "#B00000",
        });
        back.setOrigin(0.5);
        back.setInteractive();

        back.on("pointerdown", () => {
            this.scene.stop(); 
            this.scene.resume("MainMenu"); 
            useGameStore.getState().setMainMenuUIVisible(true);
        });
    }
}
