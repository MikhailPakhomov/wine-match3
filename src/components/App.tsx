import { useEffect, useRef, useState } from "react";
import { IRefPhaserGame, PhaserGame } from "./PhaserGame";
import { MainMenu } from "../game/scenes/MainMenu";
import TopMenuPanel from "./TopMenuPanel/TopMenuPanel";
import PlayButton from "./ui/PlayButton/PlayButton";
import BottomMenuPanel from "./BottomMenuPanel/BottomMenuPanel";

import { useGameStore } from "../store/useGameStore";


function App() {
    const showMainMenuUI = useGameStore((s) => s.showMainMenuUI);

    const phaserRef = useRef<IRefPhaserGame | null>(null);

    const startLevel = () => {
        const scene = useGameStore.getState().currentScene;
        if (scene && scene instanceof MainMenu) {
            useGameStore.getState().setMainMenuUIVisible(false);
            scene.startLevel();
        }
    };



    return (
        <div id="app">
            {showMainMenuUI && <TopMenuPanel />}
            <PhaserGame ref={phaserRef} />
            {showMainMenuUI && <PlayButton onClick={startLevel} />}
            {showMainMenuUI && <BottomMenuPanel />}
        </div>
    );
}

export default App;
