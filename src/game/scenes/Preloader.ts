import { bridge } from "../../bridge";
import { EventBus } from "./../EventBus";
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

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on("progress", (progress: number) => {
            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + 460 * progress;
        });
    }

    preload() {
        this.load.setPath("assets");
        this.load.image("book", "images/book.png");
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
    }

    create() {
        this.scene.start("MainMenu");
        bridge.triggerGameLoaded(this);
    }
}
