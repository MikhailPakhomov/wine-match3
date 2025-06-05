import { forwardRef, useLayoutEffect, useRef, useEffect } from "react";
import StartGame from "../game/main";
import { useGameStore } from "../store/useGameStore";
import { bridge } from "../bridge";

export interface IRefPhaserGame {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
}

export const PhaserGame = forwardRef<IRefPhaserGame, {}>(function PhaserGame(_, ref) {
  const game = useRef<Phaser.Game | null>(null!);

  useLayoutEffect(() => {
    if (game.current === null) {
      game.current = StartGame("game-container");

      if (typeof ref === "function") {
        ref({ game: game.current, scene: null });
      } else if (ref) {
        ref.current = { game: game.current, scene: null };
      }
    }

    return () => {
      if (game.current) {
        game.current.destroy(true);
        game.current = null;
      }
    };
  }, [ref]);


useEffect(() => {
  bridge.setOnGameLoaded((scene) => {
    useGameStore.getState().setLoaded(true);
    useGameStore.getState().setScene(scene);
    useGameStore.getState().setMainMenuUIVisible(true);
  });

  bridge.setOnStartLevel(() => {
    useGameStore.getState().setMainMenuUIVisible(false);
  });
}, []);

  return <div className="game-container" id="game-container"></div>;
});
