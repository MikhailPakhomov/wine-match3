
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
    if (hideUI) useGameStore.getState().setMainMenuUIVisible(false);
}
