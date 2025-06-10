import { Boot } from "./scenes/Boot";

import { Game as MainGame } from "./scenes/Game";
import { MainMenu } from "./scenes/MainMenu";
import { AUTO, Game } from "phaser";
import { Preloader } from "./scenes/Preloader";
import { Raiting } from "./scenes/Raiting";
import { Shop } from "./scenes/Shop";
import { Tavern } from "./scenes/Tavern";
import { Tasks } from "./scenes/Tasks";
import { Help } from "./scenes/Help";

const deviceWidth = window.innerWidth;
const deviceHeight = window.innerHeight;

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: "game-container",
    backgroundColor: "#ffffff",

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: deviceWidth * window.devicePixelRatio,
        height: deviceHeight * window.devicePixelRatio,
    },

    scene: [
        Boot,
        Preloader,
        MainMenu,
        MainGame,
        Raiting,
        Shop,
        Tavern,
        Tasks,
        Help,
    ],
};

const StartGame = (parent: string) => {
    (async () => {
        const game = new Game({
            ...config,
            parent,
        });
        window.game = game;

        const resize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;

            const scale = Math.min(
                width / config.scale!.width!,
                height / config.scale!.height!
            );

            const canvas = game.canvas;
            canvas.style.width = config.scale!.width! * scale + "px";
            canvas.style.height = config.scale!.height! * scale + "px";

            canvas.style.margin = "auto";
            canvas.style.position = "absolute";
            canvas.style.top = "0";
            canvas.style.left = "0";
            canvas.style.bottom = "0";
            canvas.style.right = "0";
        };

        resize();
        window.addEventListener("resize", resize);
    })();
};

export default StartGame;
