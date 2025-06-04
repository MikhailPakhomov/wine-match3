import { useEffect, useState } from "react";
import styles from "./PlayButton.module.css";
import { EventBus } from "../../../game/EventBus";

interface PlayButtonProps {
    onClick: () => void;
}

const PlayButton = ({onClick}: PlayButtonProps) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        EventBus.on("click", () => {
            setIsVisible(!isVisible);
        });
        return () => {
            EventBus.removeListener("click");
        };
    }, [isVisible]);
    return (
        <>
            <div
                className={`${
                    isVisible ? styles.buttonWrapper : styles.invisible
                }`}
            >
                <button className={styles.button} onClick={onClick}>
                    Играть
                </button>
            </div>
        </>
    );
};

export default PlayButton;
