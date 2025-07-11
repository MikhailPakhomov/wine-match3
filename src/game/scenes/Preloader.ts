import { useGameStore } from "../../store/useGameStore";
import { Scene } from "phaser";

const dpr = window.devicePixelRatio || 1;
export class Preloader extends Scene {
    constructor() {
        super("Preloader");
    }

    init() {
        const bar = this.add.rectangle(
            this.cameras.main.centerX - 460,
            this.cameras.main.centerY,
            4,
            28,
            0x000000
        );

        this.load.on("progress", (progress: number) => {
            bar.width = 4 + 460 * progress;
        });
    }

    preload() {
        this.load.setPath("assets");
        this.load.image("book", "images/book.png");
        this.load.image("logo", "images/logo.png");
        this.load.image("tile_bg", "images/tile_bg.png");
        this.load.image("field_bg", "images/field_bg.png");
        this.load.image("moves_bg", "images/moves_bg.png");
        this.load.image("score_bg", "images/score_bg.png");
        this.load.image("phone", "images/phone.png");
        this.load.image("smartphone", "images/smartphone.png");
        this.load.image("sim", "images/sim.png");
        this.load.image("message", "images/message.png");
        this.load.image("energy", "images/energy.png");
        this.load.image("discoball", "images/discoball.png");
        this.load.image("ice_full", "images/ice_full.png");
        this.load.image("ice_cracked", "images/ice_cracked.png");
        this.load.image("box_full", "images/box_full.png");
        this.load.image("box_cracked", "images/box_cracked.png");
        this.load.image("rocket", "images/rocket.png");
        this.load.image("rocketTrail", "images/rocket_trail.png");
        this.load.image("pause_btn", "images/pause_btn.png");
        this.load.image("score_icon", "images/score_icon.png");
        this.load.image("booster_wand", "images/booster_wand.png");
        this.load.image("booster_hammer", "images/booster_hammer.png");
        this.load.image("booster_glove", "images/booster_glove.png");
        this.load.image("booster_bg", "images/booster_bg.png");
        this.load.image("boosterCount_bg", "images/boosterCount_bg.png");
        this.load.image("boosterBuy_btn", "images/boosterBuy_btn.png");

        this.load.image("modalContent_bg", "images/ui/modalContent_bg.png");
        this.load.image("buy_booster_btn", "images/ui/buy_booster_btn.png");
    }

    create() {
        this.scene.start("MainMenu");
        useGameStore.getState().setScene(this);
        useGameStore.getState().setLoaded(true);
    }
}
