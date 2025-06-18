import { Scene } from "phaser";

import { useGameStore } from "../../store/useGameStore";
import { useShopStore } from "../../store/useShopStore";

const dpr = window.devicePixelRatio || 1;

export class BuyBoosters extends Scene {
    constructor() {
        super("BuyBoosters");
    }

    boosterContainers: Record<string, Phaser.GameObjects.Container>;
    create() {
        // this.cameras.main.setBackgroundColor('#68ADFF')

        const overlay = this.add
            .rectangle(
                0,
                0,
                this.cameras.main.width,
                this.cameras.main.height,
                0x68adff,
                0.5
            )
            .setOrigin(0)
            .setInteractive();

        const centerX = this.cameras.main.centerX;
        const centerY = this.cameras.main.centerY;

        const modalContainer = this.add.container(centerX, centerY);
        modalContainer.setDepth(1);

        const modalBg = this.add.image(0, 0, "modalContent_bg");
        modalBg.setScale(0.333 * dpr);
        modalBg.setOrigin(0.5);
        modalBg.setDepth(2);

        const title = this.add.text(0, -120 * dpr, "Купить Бустер", {
            font: `700 ${24 * dpr}px Roboto`,
            color: "#4299FF",
        });
        title.setDepth(3);
        title.setOrigin(0.5);
        title.setResolution(dpr);

        const text = this.add.text(
            0,
            -80 * dpr,
            "Нажите на нужное, чтобы купить",
            {
                font: `600 ${14 * dpr}px Roboto`,
                color: "#4299FF",
            }
        );
        text.setDepth(3);
        text.setOrigin(0.5);
        text.setResolution(dpr);

        const back = this.add.text(100 * dpr, -140 * dpr, "Закрыть", {
            font: `700 ${14 * dpr}px Roboto`,
            color: "#B00000",
        });
        back.setDepth(3);
        back.setOrigin(0.5);
        back.setInteractive();
        back.setResolution(dpr);

        back.on("pointerdown", () => {
            this.scene.stop();
            this.scene.resume("Game");
        });

        modalContainer.add([modalBg, title, text, back]);

        this.createBoostersPanel();
    }

    createBoostersPanel() {
        this.boosterContainers = {};

        const boosterData = useShopStore.getState().products.boosters;

        const spacing = 90 * dpr;
        const totalWidth = spacing * boosterData.length;
        const startX = this.cameras.main.centerX - totalWidth / 2 + spacing / 2;

        boosterData.forEach((booster, index) => {
            const x = startX + index * spacing;

            const container = this.add.container(x, this.cameras.main.centerY);
            container.setDepth(100);

            const icon = this.add.image(0, 0, booster.type);
            icon.setOrigin(0.5);
            icon.setScale(0.357 * dpr);
            icon.setInteractive({ useHandCursor: true });
            icon.setDepth(101);

            const badgeBg = this.add.image(
                20 * dpr,
                20 * dpr,
                "boosterCount_bg"
            );
            badgeBg.setScale(0.357 * dpr);
            badgeBg.setOrigin(0.5);
            badgeBg.setDepth(102);

            const badgeText = this.add.text(
                20 * dpr,
                20 * dpr,
                booster.qty.toString(),
                {
                    font: `700 ${16 * dpr}px Roboto`,
                    color: "#653E28",
                }
            );
            badgeText.setOrigin(0.5);
            badgeText.setName("badgeText");
            badgeText.setResolution(dpr < 2 ? 2 : dpr);
            badgeText.setDepth(103);

            const boosterBg = this.add.image(0, 0, "booster_bg");
            boosterBg.setOrigin(0.5);
            boosterBg.setDepth(100);
            boosterBg.setScale(0.333 * dpr);

            const buyBtn = this.add.image(0, 70 * dpr, "buy_booster_btn");
            buyBtn.setOrigin(0.5);
            buyBtn.setScale(0.333 * dpr);
            buyBtn.setInteractive({ useHandCursor: true });
            buyBtn.setDepth(101);
            buyBtn.on("pointerdown", () => {
                useShopStore.getState().buyBooster(booster);
            });

            container.add([boosterBg, icon, badgeBg, badgeText, buyBtn]);
            this.boosterContainers[booster.type] = container;
        });
    }
}
