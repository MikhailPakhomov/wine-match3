import { useEffect, useState } from "react";
import styles from "./topMenuPanel.module.css";
import { EventBus } from "../../game/EventBus";
import HelpTopBarIcon from "../ui/icons/HelpTopBarIcon";
import RaitingTopBarIcon from "../ui/icons/RaitingTopBarIcon";
import CoinsTopBarIcon from "../ui/icons/CoinsTopBarIcon";
import AttemptsTopBarIcon from "../ui/icons/AttemptsTopBarIcon";
import IncreaseAttmptsTopBarIcon from "../ui/icons/IncreaseAttmptsTopBarIcon";
import { useGameStore } from "../../store/useGameStore";
import { bridge } from "../../bridge";
import { navigateToScene } from "../../game/utils/navigateToScene";

const TopMenuPanel = () => {
    const scoreCount = useGameStore((state) => state.scoreCount);
    const setScore = useGameStore((state) => state.setScore);

    useEffect(() => {
        bridge.setOnScoreUpdate((score) => {
            setScore(score);
        });
    }, [setScore]);



    return (
        <div className={styles.container}>
            <div
                className={styles.help}
                onClick={() => navigateToScene("MainMenu", "Help")}
            >
                <HelpTopBarIcon />
            </div>
            <div className={styles.topPanelItemContainer}>
                <div className={styles.topPanelItemText}>{scoreCount}</div>
                <div className={styles.topPanelIcon}>
                    <RaitingTopBarIcon />
                </div>
            </div>

            <div className={styles.topPanelItemContainer}>
                <div className={styles.topPanelItemText}>100</div>
                <div className={styles.topPanelIcon}>
                    <CoinsTopBarIcon />
                </div>
            </div>

            <div className={styles.topPanelItemContainer}>
                <div className={styles.topPanelIcon}>
                    <AttemptsTopBarIcon />
                </div>
                <div className={styles.topPanelItemText}>3</div>
                <div className={styles.plusIcon}>
                    <IncreaseAttmptsTopBarIcon />
                </div>
            </div>
        </div>
    );
};

export default TopMenuPanel;
