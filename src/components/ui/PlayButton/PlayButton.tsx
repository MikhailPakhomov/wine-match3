import { useEffect, useState } from "react";
import styles from "./PlayButton.module.css";
import { EventBus } from "../../../game/EventBus";

interface PlayButtonProps {
    onClick: () => void;
}

const PlayButton = ({ onClick }: PlayButtonProps) => {
    return (
        <>
            <div className={styles.buttonWrapper}>
                <button className={styles.button} onClick={onClick}>
                    Играть
                </button>
            </div>
        </>
    );
};

export default PlayButton;
