import { useEffect, useState } from "react";
import RaitingMenuIcon from "../ui/icons/RaitingMenuIcon";
import ShopMenuIcon from "../ui/icons/ShopMenuIcon";
import TasksMenuIcon from "../ui/icons/TasksMenuIcon";
import TavernMenuIcon from "../ui/icons/TavernMenuIcon";
import styles from "./BottomMenuPanel.module.css";
import { EventBus } from "../../game/EventBus";

const BottomMenuPanel = () => {

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
        <div className={`${isVisible ? styles.bottomMenuContainer : styles.invisible}`}>
            <div className={styles.bottomMenuItemWrapper}>
                <div className={styles.bottomMenuItemIcon}>
                    <RaitingMenuIcon />
                </div>
                <div className={styles.bottomMenuItemText}>Рейтинг</div>
            </div>
            <div className={styles.bottomMenuItemWrapper}>
                <div className={styles.bottomMenuItemIcon}>
                    <TavernMenuIcon />
                </div>
                <div className={styles.bottomMenuItemText}>Таверна</div>
            </div>
            <div className={styles.bottomMenuItemWrapper}>
                <div className={styles.bottomMenuItemIcon}>
                    <ShopMenuIcon />
                </div>
                <div className={styles.bottomMenuItemText}>Магазин</div>
            </div>
            <div className={styles.bottomMenuItemWrapper}>
                <div className={styles.bottomMenuItemIcon}>
                    <TasksMenuIcon />
                </div>
                <div className={styles.bottomMenuItemText}>Задания</div>
            </div>
        </div>
    );
};

export default BottomMenuPanel;
