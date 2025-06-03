import { useEffect, useState } from "react";
import styles from "./topMenuPanel.module.css";
import { EventBus } from "../../game/EventBus";
import HelpTopBarIcon from "../ui/icons/HelpTopBarIcon";
import RaitingTopBarIcon from "../ui/icons/RaitingTopBarIcon";
import CoinsTopBarIcon from "../ui/icons/CoinsTopBarIcon";
import AttemptsTopBarIcon from "../ui/icons/AttemptsTopBarIcon";
import IncreaseAttmptsTopBarIcon from "../ui/icons/IncreaseAttmptsTopBarIcon";

const TopMenuPanel = () => {
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
        <div className={`${isVisible ? styles.container : styles.invisible}`}>
            <div className={styles.help}>
                <HelpTopBarIcon />
            </div>
            <div className={styles.topPanelItemContainer}>

                    <div className={styles.topPanelItemText}>100</div>
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
