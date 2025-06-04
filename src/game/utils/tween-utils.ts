export function tweenPromise(
    scene: Phaser.Scene,
    config: Phaser.Types.Tweens.TweenBuilderConfig
): Promise<void> {
    return new Promise((resolve) => {
        const onComplete = config.onComplete;

        config.onComplete = (...args) => {
            if (onComplete) onComplete(...args);
            resolve();
        };

        scene.tweens.add(config);
    });
}

export function delayPromise(
    scene: Phaser.Scene,
    duration: number
): Promise<void> {
    return new Promise((resolve) => {
        scene.time.delayedCall(duration, resolve);
    });
}
