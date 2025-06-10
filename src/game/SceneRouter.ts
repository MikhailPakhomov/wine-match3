import { bridge } from "../bridge";

export class SceneRouter {
    static goToScene(
        currentScene: Phaser.Scene | null,
        targetSceneKey: string,
        options?: { pauseCurrent?: boolean; hideUI?: boolean }
    ) {
        if (!currentScene) return;
        const { pauseCurrent = true, hideUI = true } = options || {};

        if (pauseCurrent) {
            currentScene.scene.pause();
        }

        currentScene.scene.launch(targetSceneKey);

        if (hideUI) {
            bridge.triggerMainMenuUIVisible(false);
        }
    }

    static backToMainMenu(currentScene: Phaser.Scene | null) {
        if (!currentScene) return;

        currentScene.scene.stop(); // закрыть текущую
        currentScene.scene.resume("MainMenu");
        bridge.triggerMainMenuUIVisible(true);
    }
}
