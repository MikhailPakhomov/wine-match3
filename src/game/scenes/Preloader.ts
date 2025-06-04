import { Scene } from "phaser";

export class Preloader extends Scene {
    constructor() {
        super("Preloader");
    }

    init() {
        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0x000000);

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
    }

    create() {
        this.scene.start("MainMenu");
    }
}
