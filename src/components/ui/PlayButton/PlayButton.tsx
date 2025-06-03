import styles from "./PlayButton.module.css";

const PlayButton = () => {
    return (
        <>
            <div className={styles.buttonWrapper}>
                <button className={styles.button}>Играть</button>
            </div>
        </>
    );
};

export default PlayButton;
