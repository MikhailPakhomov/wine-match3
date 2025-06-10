import { bridge } from "../../bridge";
import { useGameStore } from "../../store/useGameStore";

export function navigateToScene(
    from: string,
    to: string,
    hideUI: boolean = true
) {
    const scene = useGameStore.getState().currentScene;
    if (!scene) return;

    scene.scene.launch(to);
    scene.scene.pause(from);
    if (hideUI) bridge.triggerMainMenuUIVisible(false);
}
