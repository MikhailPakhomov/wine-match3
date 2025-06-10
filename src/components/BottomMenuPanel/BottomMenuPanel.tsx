import { useEffect, useState } from "react";
import RaitingMenuIcon from "../ui/icons/RaitingMenuIcon";
import ShopMenuIcon from "../ui/icons/ShopMenuIcon";
import TasksMenuIcon from "../ui/icons/TasksMenuIcon";
import TavernMenuIcon from "../ui/icons/TavernMenuIcon";
import styles from "./BottomMenuPanel.module.css";
import { navigateToScene } from "../../game/utils/navigateToScene";

const BottomMenuPanel = () => {
    return (
        <div className={styles.bottomMenuContainer}>
            <div
                className={styles.bottomMenuItemWrapper}
                onClick={() => navigateToScene("MainMenu", "Raiting")}
            >
                <div className={styles.bottomMenuItemIcon}>
                    <RaitingMenuIcon />
                </div>
                <div className={styles.bottomMenuItemText}>Рейтинг</div>
            </div>
            <div
                className={styles.bottomMenuItemWrapper}
                onClick={() => navigateToScene("MainMenu", "Tavern")}
            >
                <div className={styles.bottomMenuItemIcon}>
                    <TavernMenuIcon />
                </div>
                <div className={styles.bottomMenuItemText}>Таверна</div>
            </div>
            <div
                className={styles.bottomMenuItemWrapper}
                onClick={() => navigateToScene("MainMenu", "Shop")}
            >
                <div className={styles.bottomMenuItemIcon}>
                    <ShopMenuIcon />
                </div>
                <div className={styles.bottomMenuItemText}>Магазин</div>
            </div>
            <div
                className={styles.bottomMenuItemWrapper}
                onClick={() => navigateToScene("MainMenu", "Tasks")}
            >
                <div className={styles.bottomMenuItemIcon}>
                    <TasksMenuIcon />
                </div>
                <div className={styles.bottomMenuItemText}>Задания</div>
            </div>
        </div>
    );
};

export default BottomMenuPanel;
