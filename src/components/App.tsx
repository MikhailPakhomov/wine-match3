import { useRef, useState } from "react";
import { IRefPhaserGame, PhaserGame } from "./PhaserGame";
import { MainMenu } from "../game/scenes/MainMenu";
import TopMenuPanel from "./TopMenuPanel/TopMenuPanel";
import PlayButton from "./ui/PlayButton/PlayButton";
import BottomMenuPanel from "./BottomMenuPanel/BottomMenuPanel";

function App() {

    const [canMoveSprite, setCanMoveSprite] = useState(true);

    const phaserRef = useRef<IRefPhaserGame | null>(null);

    const currentScene = (scene: Phaser.Scene) => {
        setCanMoveSprite(scene.scene.key !== "MainMenu");
    };
    const startLevel = () => {
        if (phaserRef.current) {
            const scene = phaserRef.current.scene as MainMenu;

            if (scene) {
                scene.startLevel();
            }
        }
    };
    return (
        <div id="app">
            <TopMenuPanel />
            <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
            <PlayButton onClick={startLevel} />
            <BottomMenuPanel />
        </div>
    );
}

export default App;
