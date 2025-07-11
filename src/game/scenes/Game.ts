import { Scene } from "phaser";
import { delayPromise, tweenPromise } from "../utils/tween-utils";
import { LevelConfig, LevelGoal } from "../levels/levelConfig";
import { useGameStore, Booster } from "../../store/useGameStore";
import { use } from "matter";

const dpr = window.devicePixelRatio || 1;
export class Game extends Scene {
    camera: Phaser.Cameras.Scene2D.Camera;
    background: Phaser.GameObjects.Image;
    gameText: Phaser.GameObjects.Text;

    levelConfig!: LevelConfig;
    remainingMoves!: number;

    score: number;

    scoreContainer: Phaser.GameObjects.Container;
    movesContainer: Phaser.GameObjects.Container;
    scoreText: Phaser.GameObjects.Text;
    movesText: Phaser.GameObjects.Text;
    movesBg: Phaser.GameObjects.Image;
    unsubscribeMoves: () => void = () => {};
    unsubscribeGoals: () => void = () => {};
    unsubscribeBoosters: () => void = () => {};
    pauseButton!: Phaser.GameObjects.Image;

    selectedTile: Phaser.GameObjects.Sprite | null = null;
    selectedTileTween: Phaser.Tweens.Tween | null = null;
    grid: (Phaser.GameObjects.Sprite | null)[][] = [];
    holePositions: Set<string> = new Set();

    selectedSprite: Phaser.GameObjects.Sprite | null = null;
    pointerDownPos: { x: number; y: number } | null = null;

    goalIcons: {
        [type: string]: {
            icon: Phaser.GameObjects.Sprite;
            text: Phaser.GameObjects.Text;
            circle: Phaser.GameObjects.Image;
            container: Phaser.GameObjects.Container;
            target: number;
            current: number;
        };
    } = {};

    levelCompleted = false;

    cellSize = 48 * dpr;
    gap = 2 * dpr;

    rows: number;
    cols: number;

    offsetX = 0;
    offsetY = 0;

    scaleFactor = 0;

    posForHelpersX = 0;
    posForHelpersY = 0;

    isInputLocked = false;
    isProcessing = false;
    isPaused = false;

    isWandActive: boolean = false;
    isHammerActive: boolean = false;
    isGloveActive: boolean = false;

    boosterContainers: Record<string, Phaser.GameObjects.Container>;

    activeBoosterIcon: Phaser.GameObjects.Image | null;
    activeBoosterTween: Phaser.Tweens.Tween | null;

    constructor() {
        super("Game");
    }

    setupPointerEvents(
        sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container
    ) {
        sprite.on("pointerover", () => {
            sprite.setAlpha(0.7);
        });

        sprite.on("pointerout", () => {
            sprite.setAlpha(1);
        });

        sprite.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (this.isInputLocked) return;

            const iceData = sprite.getData("ice");
            const box = sprite.getData("box");
            const isBoosterActive = this.isWandActive || this.isHammerActive;

            if (iceData && iceData.strength > 0 && !isBoosterActive) return;
            if (box && box.strength > 0 && !isBoosterActive) return;

            sprite.setData("pointerDown", {
                x: pointer.x,
                y: pointer.y,
            });

            this.selectedSprite = sprite;
            this.pointerDownPos = {
                x: pointer.x,
                y: pointer.y,
            };
        });

        sprite.on("pointerup", (pointer: Phaser.Input.Pointer) => {
            this.input.emit("pointerup", pointer);
        });
    }
    async handleTileClick(tile: Phaser.GameObjects.Sprite) {
        if (this.isProcessing || this.isInputLocked) return;

        this.isInputLocked = true;

        if (this.isWandActive) {
            this.clearActiveBoosterVisual();
            await this.useWandOnTile(tile);
            this.isInputLocked = false;
            this.isWandActive = false;
            return;
        }

        if (this.isHammerActive) {
            this.clearActiveBoosterVisual();
            await this.useHammerOnTile(tile);
            this.isHammerActive = false;
            this.isInputLocked = false;
            return;
        }

        const baseSize = this.cellSize * this.scaleFactor;

        try {
            const isHelper = tile.getData("isHelper");

            const helperType = tile.getData("helperType");

            if (isHelper) {
                if (isHelper && !this.isGloveActive) {
                    if (helperType === "discoball" && this.selectedTile) {
                        await this._activateSingleHelper(
                            tile,
                            this.selectedTile,
                            new Set()
                        );
                        this.selectedTile = null;
                        return;
                    }

                    await this.activateHelperChain([tile]);
                    this.selectedTile = null;
                    return;
                }

                const isSelected = !!this.selectedTile;
                const x1 = this.selectedTile?.getData("gridX");
                const y1 = this.selectedTile?.getData("gridY");
                const x2 = tile.getData("gridX");
                const y2 = tile.getData("gridY");
                const dx = Math.abs(x1 - x2);
                const dy = Math.abs(y1 - y2);

                const canSwap =
                    (dx === 1 && dy === 0) || (dx === 0 && dy === 1);

                if (isSelected && (canSwap || this.isGloveActive)) {
                    this.tweens.remove(this.selectedTileTween);
                    this.selectedTile.setDisplaySize(
                        baseSize - 5 * dpr,
                        baseSize - 5 * dpr
                    );

                    await this.basicSwap(this.selectedTile, tile);

                    if (helperType === "discoball") {
                        await this._activateSingleHelper(
                            tile,
                            this.selectedTile,
                            new Set()
                        );
                    } else {
                        await this.activateHelperChain([tile]);
                    }

                    this.selectedTile = null;
                    this.selectedTileTween = null;

                    if (this.isGloveActive) {
                        this.isGloveActive = false;
                        // this.decreaseBoosterCount("booster_glove");
                        useGameStore
                            .getState()
                            .decreaseBoosterCount("booster_glove");
                        this.clearActiveBoosterVisual();
                    }

                    return;
                }

                if (this.selectedTileTween) {
                    this.tweens.remove(this.selectedTileTween);
                }

                this.selectedTile = tile;
                this.selectedTileTween = this.tweens.add({
                    targets: tile,
                    displayWidth: baseSize * 1.1,
                    displayHeight: baseSize * 1.1,
                    ease: "Sine.easeInOut",
                    duration: 300,
                    repeat: -1,
                    yoyo: true,
                });

                return;
            }

            const selectedAnimation = {
                targets: tile,
                displayWidth: baseSize * 1.1,
                displayHeight: baseSize * 1.1,
                ease: "Sine.easeInOut",
                duration: 300,
                repeat: -1,
                yoyo: true,
            };

            if (!this.selectedTile) {
                this.selectedTile = tile;

                if (this.selectedTileTween) {
                    this.tweens.remove(this.selectedTileTween);
                }

                this.selectedTileTween = this.tweens.add(selectedAnimation);
                return;
            }

            if (tile === this.selectedTile) {
                this.tweens.remove(this.selectedTileTween);
                this.selectedTile.setDisplaySize(
                    baseSize - 5 * dpr,
                    baseSize - 5 * dpr
                );
                this.selectedTile = null;
                this.selectedTileTween = null;
                return;
            }

            const x1 = this.selectedTile.getData("gridX");
            const y1 = this.selectedTile.getData("gridY");
            const x2 = tile.getData("gridX");
            const y2 = tile.getData("gridY");

            const dx = Math.abs(x1 - x2);
            const dy = Math.abs(y1 - y2);

            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                this.tweens.remove(this.selectedTileTween);
                this.selectedTile.setDisplaySize(
                    baseSize - 5 * dpr,
                    baseSize - 5 * dpr
                );
                await this.swapTiles(this.selectedTile, tile);
                this.selectedTile = null;
                this.selectedTileTween = null;
            } else {
                this.tweens.remove(this.selectedTileTween);
                this.selectedTile.setDisplaySize(
                    baseSize - 5 * dpr,
                    baseSize - 5 * dpr
                );
                this.selectedTile = tile;
                this.selectedTileTween = this.tweens.add(selectedAnimation);
            }
        } finally {
            this.isInputLocked = false;
        }
    }

    async handleSwipe(
        tile: Phaser.GameObjects.Sprite,
        pointer: Phaser.Input.Pointer,
        start: { x: number; y: number }
    ) {
        if (this.isProcessing || this.isInputLocked) return;

        this.isInputLocked = true;

        const baseSize = this.cellSize * this.scaleFactor;

        if (this.selectedTileTween) {
            this.tweens.remove(this.selectedTileTween);
            this.selectedTileTween = null;
        }

        if (this.selectedTile) {
            this.selectedTile.setDisplaySize(baseSize, baseSize);
            this.selectedTile = null;
        }

        try {
            const dx = pointer.x - start.x;
            const dy = pointer.y - start.y;

            let dirX = 0;
            let dirY = 0;

            const angle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));

            if (angle >= -45 && angle <= 45) dirX = 1;
            else if (angle >= 135 || angle <= -135) dirX = -1;
            else if (angle > 45 && angle < 135) dirY = 1;
            else if (angle < -45 && angle > -135) dirY = -1;

            const gridX = tile.getData("gridX");
            const gridY = tile.getData("gridY");
            const targetX = gridX + dirX;
            const targetY = gridY + dirY;

            if (
                targetX >= 0 &&
                targetX < this.cols &&
                targetY >= 0 &&
                targetY < this.rows
            ) {
                const neighbor = this.grid[targetY][targetX];

                if (neighbor) {
                    if (tile.getData("ice") || neighbor.getData("ice")) return;
                    if (tile.getData("box") || neighbor.getData("box")) return;

                    await this.swapTiles(tile, neighbor);
                }
            }
        } finally {
            this.isInputLocked = false;
        }
    }

    async basicSwap(
        tileA: Phaser.GameObjects.Sprite,
        tileB: Phaser.GameObjects.Sprite,
        skipMoveDeduction = false
    ) {
        // this.sound.play("move_tile");
        const xA = tileA.getData("gridX");
        const yA = tileA.getData("gridY");
        const xB = tileB.getData("gridX");
        const yB = tileB.getData("gridY");

        const oldCoords = {
            tileA: { x: xA, y: yA },
            tileB: { x: xB, y: yB },
        };

        this.grid[yA][xA] = tileB;
        this.grid[yB][xB] = tileA;

        tileA.setData("gridX", xB);
        tileA.setData("gridY", yB);
        tileB.setData("gridX", xA);
        tileB.setData("gridY", yA);

        const spacing = this.gap;
        const cellSize = this.cellSize;

        const newPosA = {
            x: this.offsetX + xB * (cellSize + spacing) + cellSize / 2,
            y: this.offsetY + yB * (cellSize + spacing) + cellSize / 2,
        };
        const newPosB = {
            x: this.offsetX + xA * (cellSize + spacing) + cellSize / 2,
            y: this.offsetY + yA * (cellSize + spacing) + cellSize / 2,
        };

        await Promise.all([
            tweenPromise(this, {
                targets: tileA,
                x: newPosA.x,
                y: newPosA.y,
                duration: 300,
                ease: "Power2",
            }),
            tweenPromise(this, {
                targets: tileB,
                x: newPosB.x,
                y: newPosB.y,
                duration: 300,
                ease: "Power2",
            }),
        ]);

        if (tileA.getData("isHelper") || tileB.getData("isHelper")) return;

        const displaySize = this.cellSize - 5 * dpr;

        tileA.setDisplaySize(displaySize, displaySize);
        tileB.setDisplaySize(displaySize, displaySize);

        const matches = this.findMatches?.();
        if (matches && matches.length > 0) {
            useGameStore.getState().decreaseMoves();
            this.checkWin();

            this.removeMatches(matches);

            let helperSpawned = false;

            let spawnX = xB;
            let spawnY = yB;

            for (const match of matches) {
                let type: string | null = null;

                if (match.length >= 5) {
                    type = "discoball";
                } else if (match.length === 4) {
                    const isHorizontal = this.isHorizontalMatch(match);
                    type = isHorizontal ? "verticalHelper" : "horizontalHelper";
                }

                if (type) {
                    const found = match.find((t) => t === tileA || t === tileB);
                    if (found) {
                        spawnX = found.getData("gridX");
                        spawnY = found.getData("gridY");
                    }

                    helperSpawned = true;
                    await delayPromise(this, 150);
                    this.createHelperWithEffect(spawnX, spawnY, type);
                }
            }

            await delayPromise(this, helperSpawned ? 450 : 300);
            await this.dropTiles();
            await delayPromise(this, 100);
            await this.fillEmptyTiles();
            await this.processMatchesLoop();
            await this.reshuffleBoardIfNoMoves();
        } else {
            if (!this.isGloveActive) {
                await this.undoSwap(tileA, tileB, oldCoords);
            }
        }
        if (this.isGloveActive) {
            console.log(555);
            this.isGloveActive = false;
            // this.decreaseBoosterCount("booster_glove");
            useGameStore.getState().decreaseBoosterCount("booster_glove");
            this.clearActiveBoosterVisual();
        }
        this.isProcessing = false;
        this.isInputLocked = false;
    }
    async swapTiles(
        tileA: Phaser.GameObjects.Sprite,
        tileB: Phaser.GameObjects.Sprite
    ) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const isHelperA = tileA?.getData("isHelper");
        const isHelperB = tileB?.getData("isHelper");
        const typeA = tileA?.getData("type");
        const typeB = tileB?.getData("type");

        const isDiscoA = typeA === "discoball";
        const isDiscoB = typeB === "discoball";

        if (isDiscoA && !isDiscoB) {
            await this.basicSwap(tileA, tileB);
            await tweenPromise(this, {
                targets: tileA,
                angle: 360,
                duration: 400,
                ease: "Cubic.easeOut",
            });
            tileA.setAngle(0);

            await this._activateSingleHelper(tileA, tileB, new Set());
            if (this.isGloveActive) {
                this.isGloveActive = false;
                // this.decreaseBoosterCount("booster_glove");
                useGameStore.getState().decreaseBoosterCount("booster_glove");
                this.clearActiveBoosterVisual();
            }
            return;
        }
        if (isDiscoB && !isDiscoA) {
            await this.basicSwap(tileA, tileB);

            await this._activateSingleHelper(tileB, tileA, new Set());
            if (this.isGloveActive) {
                this.isGloveActive = false;
                // this.decreaseBoosterCount("booster_glove");
                useGameStore.getState().decreaseBoosterCount("booster_glove");
                this.clearActiveBoosterVisual();
            }
            return;
        }
        if (isDiscoA && isDiscoB) {
            await this.clearBoard();
            await this.fillEmptyTiles();
            await this.processMatchesLoop();
            if (this.isGloveActive) {
                this.isGloveActive = false;
                // this.decreaseBoosterCount("booster_glove");
                useGameStore.getState().decreaseBoosterCount("booster_glove");
                this.clearActiveBoosterVisual();
            }
            return;
        }

        if (isHelperA && isHelperB) {
            await this.activateHelperChain([tileA, tileB]);
            if (this.isGloveActive) {
                this.isGloveActive = false;
                // this.decreaseBoosterCount("booster_glove");
                useGameStore.getState().decreaseBoosterCount("booster_glove");
                this.clearActiveBoosterVisual();
            }
            return;
        }
        if (isHelperA) {
            await this.basicSwap(tileA, tileB);

            await this.activateHelperChain([tileA]);
            if (this.isGloveActive) {
                this.isGloveActive = false;
                // this.decreaseBoosterCount("booster_glove");
                useGameStore.getState().decreaseBoosterCount("booster_glove");
                this.clearActiveBoosterVisual();
            }
            return;
        }
        if (isHelperB) {
            await this.basicSwap(tileA, tileB);

            await this.activateHelperChain([tileB]);
            if (this.isGloveActive) {
                this.isGloveActive = false;
                // this.decreaseBoosterCount("booster_glove");
                useGameStore.getState().decreaseBoosterCount("booster_glove");
                this.clearActiveBoosterVisual();
            }
            return;
        }
        await this.basicSwap(tileA, tileB);
    }

    private isValidTile(tile: any): tile is Phaser.GameObjects.Sprite {
        return tile && typeof tile.getData === "function";
    }

    findMatches(): Phaser.GameObjects.Sprite[][] {
        const matches: Phaser.GameObjects.Sprite[][] = [];

        const height = this.grid.length;
        const width = this.grid[0].length;

        const isMatchable = (
            tile: Phaser.GameObjects.Sprite | null
        ): boolean => {
            return (
                this.isValidTile(tile) &&
                !tile.getData("box") &&
                !tile.getData("isHelper") &&
                !!tile.getData("type")
            );
        };

        for (let y = 0; y < height; y++) {
            let streak: Phaser.GameObjects.Sprite[] = [];
            let prevType: string | null = null;

            for (let x = 0; x < width; x++) {
                const tile = this.grid[y][x];

                if (!isMatchable(tile)) {
                    if (streak.length >= 3) matches.push([...streak]);
                    streak = [];
                    prevType = null;
                    continue;
                }

                const type = tile.getData("type");

                if (type === prevType) {
                    streak.push(tile);
                } else {
                    if (streak.length >= 3) matches.push([...streak]);
                    streak = [tile];
                }

                prevType = type;
            }

            if (streak.length >= 3) matches.push([...streak]);
        }

        for (let x = 0; x < width; x++) {
            let streak: Phaser.GameObjects.Sprite[] = [];
            let prevType: string | null = null;

            for (let y = 0; y < height; y++) {
                const tile = this.grid[y][x];

                if (!isMatchable(tile)) {
                    if (streak.length >= 3) matches.push([...streak]);
                    streak = [];
                    prevType = null;
                    continue;
                }

                const type = tile.getData("type");

                if (type === prevType) {
                    streak.push(tile);
                } else {
                    if (streak.length >= 3) matches.push([...streak]);
                    streak = [tile];
                }

                prevType = type;
            }

            if (streak.length >= 3) matches.push([...streak]);
        }

        return matches;
    }

    async removeMatches(matches: Phaser.GameObjects.Sprite[][]): Promise<void> {
        const tweens: Promise<void>[] = [];
        const tilesToDestroyLater: Phaser.GameObjects.Sprite[] = [];
        const damagedTiles = new Set<Phaser.GameObjects.Sprite>();
        const handled = new Set<Phaser.GameObjects.Sprite>();
        const size = this.cellSize * this.scaleFactor;
        const tilesJustDamagedInFirstPass =
            new Set<Phaser.GameObjects.Sprite>();

        const directions = [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
        ];

        let iceSoundPlayed = false;
        let boxSoundPlayed = false;

        for (const row of this.grid) {
            for (const tile of row) {
                tile?.setData("justReleasedFromIce", false);
            }
        }

        for (const group of matches) {
            for (const tile of group) {
                this.score += 1;
                const x = tile.getData("gridX");
                const y = tile.getData("gridY");

                for (const { dx, dy } of directions) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (!this.grid[ny] || !this.grid[ny][nx]) continue;

                    const neighbor = this.grid[ny][nx];
                    if (!neighbor || damagedTiles.has(neighbor)) continue;

                    if (neighbor.getData("ice")) {
                        if (!iceSoundPlayed) {
                            // this.sound.play("ice");
                            iceSoundPlayed = true;
                        }
                        const ice = neighbor.getData("ice");
                        const iceSprite = neighbor.getData("iceSprite");
                        if (ice.strength > 1) {
                            ice.strength--;
                            if (iceSprite) iceSprite.setTexture("ice_cracked");
                        } else {
                            if (iceSprite) iceSprite.destroy();
                            neighbor.setData("ice", null);
                            neighbor.setData("iceSprite", null);
                            neighbor.setData("justReleasedFromIce", true);
                        }
                        tilesJustDamagedInFirstPass.add(neighbor);
                        damagedTiles.add(neighbor);
                    }

                    if (neighbor.getData("box")) {
                        if (!boxSoundPlayed) {
                            // this.sound.play("box");
                            boxSoundPlayed = true;
                        }
                        const box = neighbor.getData("box");
                        const sprite =
                            neighbor.getData("boxSprite") || neighbor;
                        if (box.strength > 1) {
                            box.strength--;
                            sprite.setTexture("box_cracked");
                        } else {
                            const gx = neighbor.getData("gridX");
                            const gy = neighbor.getData("gridY");
                            this.grid[gy][gx] = null;

                            sprite.setData("gridX", gx);
                            sprite.setData("gridY", gy);
                            sprite.setData("type", "box");

                            await this.animateAndRemoveMatchesGoals(
                                sprite,
                                size,
                                tweens,
                                tilesToDestroyLater
                            );
                            this.updateGoalProgress(sprite.getData("type"));

                            tweens.push(
                                tweenPromise(this, {
                                    targets: sprite,
                                    alpha: 0,
                                    duration: 200,
                                    onComplete: () => {
                                        this.updateGoalProgress("box_full");
                                        this.checkWin();
                                        sprite.destroy();
                                    },
                                })
                            );
                        }
                        damagedTiles.add(neighbor);
                    }
                }
            }
        }

        for (const group of matches) {
            for (const tile of group) {
                if (handled.has(tile)) continue;
                handled.add(tile);

                const x = tile.getData("gridX");
                const y = tile.getData("gridY");

                const ice = tile.getData("ice");
                const iceSprite = tile.getData("iceSprite");
                const isReleased = tile.getData("justReleasedFromIce");

                if (ice || isReleased) {
                    if (tilesJustDamagedInFirstPass.has(tile)) continue;

                    if (ice && ice.strength > 1) {
                        ice.strength--;
                        if (iceSprite) iceSprite.setTexture("ice_cracked");
                    } else if (ice) {
                        if (iceSprite) iceSprite.destroy();
                        tile.setData("ice", null);
                        tile.setData("iceSprite", null);
                        tile.setData("justReleasedFromIce", true);
                    }
                    damagedTiles.add(tile);
                    continue;
                }

                if (this.grid[y][x] === tile) {
                    this.grid[y][x] = null;
                }

                await this.animateAndRemoveMatchesGoals(
                    tile,
                    size,
                    tweens,
                    tilesToDestroyLater
                );
                this.updateGoalProgress(tile.getData("type"));
            }
        }

        await Promise.all(tweens);
        this.updateScore();
        for (const tile of tilesToDestroyLater) tile.destroy();
    }

    async animateAndRemoveMatchesGoals(
        tile: Phaser.GameObjects.Sprite,
        size?: number,
        tweens?: Promise<void>[],
        tilesToDestroyLater?: Phaser.GameObjects.Sprite[],
        isDiscoBall?: boolean
    ): Promise<void> {
        if (!tile || typeof tile.getData !== "function") return;

        if (tile.getData("removing")) return;

        tile.setData("removing", true);

        const type = tile.getData("type");
        const isBox = tile.getData("box");
        const goalType = isBox ? "box_full" : type;

        const goal = this.goalIcons?.[goalType];

        const x = tile.getData("gridX");
        const y = tile.getData("gridY");

        if (goal) {
            tile.setVisible(false);

            const clone = this.add.sprite(
                tile.x,
                tile.y,
                type === "box" ? "box_cracked" : type
            );
            clone.setDisplaySize(size, size);
            clone.setDepth(1000);
            if (!goal) return;

            const { container } = goal;
            const worldPos = container
                .getWorldTransformMatrix()
                .transformPoint(0, 0);

            const targetX = worldPos.x;
            const targetY = worldPos.y;

            this.spawnTileParticles(tile.x, tile.y, type);

            tweens?.push(
                tweenPromise(this, {
                    targets: clone,
                    x: targetX,
                    y: targetY,
                    scale: 0,
                    alpha: 0.9,
                    duration: 400,
                    ease: "Cubic.easeIn",
                    onComplete: () => {
                        // useGameStore.getState().updateGoal(goalType, 1);
                        // this.updateGoalProgress(goalType);
                        // this.checkWin();
                        clone.destroy();

                        if (this.grid?.[y]?.[x] === tile) {
                            this.grid[y][x] = null;
                        }

                        tilesToDestroyLater?.push(tile);
                    },
                })
            );
        } else {
            tile.setVisible(true);
            tile.setAlpha(1);
            tile.setDisplaySize(size, size);

            await tweenPromise(this, {
                targets: tile,
                scale: 0.45,
                duration: 100,
                ease: "Power1",
                onComplete: () => {
                    if (!isDiscoBall) {
                        // this.sound.play("remove_tile");
                    }
                    this.spawnTileParticles(tile.x, tile.y, type);
                },
            });

            if (this.grid?.[y]?.[x] === tile) {
                this.grid[y][x] = null;
            }

            tweens?.push(
                tweenPromise(this, {
                    targets: tile,
                    alpha: 0,
                    displayWidth: 0,
                    displayHeight: 0,
                    duration: 300,
                    ease: "Power1",
                    onComplete: () => {
                        // useGameStore.getState().updateGoal(goalType, 1);
                        // this.updateGoalProgress(goalType);
                        // this.checkWin();

                        if (this.grid?.[y]?.[x] === tile) {
                            this.grid[y][x] = null;
                        }

                        tilesToDestroyLater?.push(tile);
                    },
                })
            );
        }
    }

    spawnTileParticles(x: number, y: number, type: string) {
        const blackParticlesGraphics = this.make.graphics({
            x: 0,
            y: 0,
            add: false,
        });
        blackParticlesGraphics.fillStyle(0x000000, 1);
        blackParticlesGraphics.fillCircle(2, 2, 2);
        blackParticlesGraphics.generateTexture(`particle_black`, 8, 8);
        blackParticlesGraphics.destroy();

        const textureKey = `particle_${type}`;

        const particles = this.add.particles(0, 0, textureKey, {
            x: { min: -12 * dpr, max: 12 * dpr },
            y: { min: -12 * dpr, max: 12 * dpr },
            speed: { min: 10, max: 20 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8 * dpr, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 200,
            gravityY: 50 * dpr,
            quantity: 5,
            blendMode: "NORMAL",
        });

        const blackParticles = this.add.particles(0, 0, `particle_black`, {
            x: { min: -12 * dpr, max: 12 * dpr },
            y: { min: -12 * dpr, max: 12 * dpr },
            speed: { min: 10, max: 15 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.8 * dpr, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 50,
            gravityY: 50 * dpr,
            quantity: 3,
            blendMode: "NORMAL",
        });

        blackParticles.setPosition(x, y);
        blackParticles.setDepth(999);

        particles.setPosition(x, y);
        particles.setDepth(1000);

        this.time.delayedCall(300, () => {
            particles.destroy();
            blackParticles.destroy();
        });
    }

    async undoSwap(
        tileA: Phaser.GameObjects.Sprite,
        tileB: Phaser.GameObjects.Sprite,
        coords: {
            tileA: { x: number; y: number };
            tileB: { x: number; y: number };
        }
    ): Promise<void> {
        // this.sound.play("move_tile");

        const { tileA: oldA, tileB: oldB } = coords;

        this.grid[oldA.y][oldA.x] = tileA;
        this.grid[oldB.y][oldB.x] = tileB;

        tileA.setData("gridX", oldA.x);
        tileA.setData("gridY", oldA.y);
        tileB.setData("gridX", oldB.x);
        tileB.setData("gridY", oldB.y);

        const spacing = this.gap;
        const cellSize = this.cellSize;

        const posA = {
            x: this.offsetX + oldA.x * (cellSize + spacing) + cellSize / 2,
            y: this.offsetY + oldA.y * (cellSize + spacing) + cellSize / 2,
        };
        const posB = {
            x: this.offsetX + oldB.x * (cellSize + spacing) + cellSize / 2,
            y: this.offsetY + oldB.y * (cellSize + spacing) + cellSize / 2,
        };

        await Promise.all([
            tweenPromise(this, {
                targets: tileA,
                x: posA.x,
                y: posA.y,
                duration: 250,
                ease: "Power2",
            }),
            tweenPromise(this, {
                targets: tileB,
                x: posB.x,
                y: posB.y,
                duration: 250,
                ease: "Power2",
            }),
        ]);
        this.isProcessing = false;
    }

    async dropTiles(): Promise<void> {
        // this.sound.play("move_tile");
        const tweens: Promise<void>[] = [];
        const gap = this.gap;
        const size = this.cellSize;
        const height = this.grid.length;
        const width = this.grid[0].length;

        for (let x = 0; x < width; x++) {
            const col: (Phaser.GameObjects.Sprite | null)[] = [];
            for (let y = 0; y < height; y++) {
                col.push(this.grid[y][x]);
            }

            const newCol = Array(height).fill(null);

            let insertY = height - 1;

            for (let y = height - 1; y >= 0; y--) {
                const tile = col[y];
                const currentKey = `${x},${y}`;

                if (tile && !this.holePositions.has(currentKey)) {
                    while (
                        insertY >= 0 &&
                        this.holePositions.has(`${x},${insertY}`)
                    ) {
                        insertY--;
                    }

                    if (insertY < 0) break;

                    newCol[insertY] = tile;

                    if (y !== insertY) {
                        tile.setData("gridY", insertY);
                        this.grid[insertY][x] = tile;
                        this.grid[y][x] = null;

                        const targetY =
                            this.offsetY + insertY * (size + gap) + size / 2;

                        tweens.push(
                            new Promise((resolve) => {
                                this.tweens.add({
                                    targets: tile,
                                    y: targetY,
                                    duration: 250,
                                    ease: "Power2",
                                    onComplete: () => resolve(),
                                });
                            })
                        );

                        const iceSprite = tile.getData("iceSprite");
                        if (iceSprite) {
                            tweens.push(
                                new Promise((resolve) => {
                                    this.tweens.add({
                                        targets: iceSprite,
                                        y: targetY,
                                        duration: 250,
                                        ease: "Power2",
                                        onComplete: () => resolve(),
                                    });
                                })
                            );
                        }
                    }

                    insertY--;
                }
            }
        }

        await Promise.all(tweens);
    }

    getRandomTile() {
        const types = this.levelConfig.elements;
        return Phaser.Utils.Array.GetRandom(types);
    }

    async fillEmptyTiles(): Promise<void> {
        // this.sound.play("move_tile");
        const gap = this.gap;
        const cellSize = this.cellSize;
        const tweenPromises: Promise<void>[] = [];

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                const posKey = `${x},${y}`;
                if (!this.grid[y][x] && !this.holePositions.has(posKey)) {
                    const type = this.getRandomTile();
                    const sprite = this.add.sprite(
                        this.offsetX + x * (cellSize + gap) + cellSize / 2,
                        -cellSize,
                        type
                    );
                    sprite.setOrigin(0.5);
                    sprite.setDisplaySize(
                        cellSize * this.scaleFactor - 5 * dpr,
                        cellSize * this.scaleFactor - 5 * dpr
                    );
                    sprite.setInteractive();
                    sprite.setData("gridX", x);
                    sprite.setData("gridY", y);
                    sprite.setData("type", type);
                    sprite.setDepth(5);

                    this.setupPointerEvents(sprite);
                    this.grid[y][x] = sprite;

                    const targetY =
                        this.offsetY + y * (cellSize + gap) + cellSize / 2;
                    tweenPromises.push(
                        new Promise((resolve) => {
                            this.tweens.add({
                                targets: sprite,
                                y: targetY,
                                duration: 250,
                                ease: "Cubic.easeOut",
                                onComplete: () => resolve(),
                            });
                        })
                    );
                }
            }
        }

        await Promise.all(tweenPromises);
    }

    async processMatchesLoop(): Promise<void> {
        this.isProcessing = true;
        const matches = this.findMatches();

        if (matches.length > 0) {
            const helpersToCreate: { x: number; y: number; type: string }[] =
                [];

            for (const match of matches) {
                const valid = match.filter(
                    (tile) =>
                        tile &&
                        tile.active &&
                        this.grid?.[tile.getData("gridY")]?.[
                            tile.getData("gridX")
                        ] === tile
                );

                if (valid.length >= 5) {
                    const center = valid[Math.floor(valid.length / 2)];
                    helpersToCreate.push({
                        x: center.getData("gridX"),
                        y: center.getData("gridY"),
                        type: "discoball",
                    });
                } else if (valid.length === 4) {
                    const type = this.isHorizontalMatch(valid)
                        ? "verticalHelper"
                        : "horizontalHelper";
                    const center = valid[Math.floor(valid.length / 2)];
                    helpersToCreate.push({
                        x: center.getData("gridX"),
                        y: center.getData("gridY"),
                        type,
                    });
                }
            }

            await this.removeMatches(matches);

            for (const helper of helpersToCreate) {
                if (this.grid[helper.y][helper.x]) {
                    this.grid[helper.y][helper.x].destroy();
                }
                await this.createHelperWithEffect(
                    helper.x,
                    helper.y,
                    helper.type
                );
            }

            await delayPromise(this, 100);
            await this.dropTiles();
            await this.fillEmptyTiles();
            await delayPromise(this, 100);

            this.cleanupGrid();
            await this.processMatchesLoop();
            await this.reshuffleBoardIfNoMoves();
        } else {
            this.isProcessing = false;
        }
    }

    cleanupGrid() {
        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid[0].length; x++) {
                const tile = this.grid[y][x];

                if (tile && (!tile.active || tile.getData("removing"))) {
                    console.warn(
                        "🧹 Удалённый или сломанный тайл в grid — чистим вручную",
                        x,
                        y
                    );
                    this.grid[y][x] = null;
                }
            }
        }
    }

    async createHelperWithEffect(
        x: number,
        y: number,
        type: string
    ): Promise<void> {
        const spacing = this.gap;
        const cellSize = this.cellSize;

        const posX = this.offsetX + x * (cellSize + spacing) + cellSize / 2;
        const posY = this.offsetY + y * (cellSize + spacing) + cellSize / 2;

        let sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;

        if (type === "verticalHelper") {
            sprite = this.createDoubleRocketVertical(posX, posY);
        } else if (type === "horizontalHelper") {
            sprite = this.createDoubleRocketHorizontal(posX, posY);
        } else if (type === "discoball") {
            const from = this.cellSize;
            const to = this.cellSize - 5 * dpr;

            sprite = this.add.sprite(posX, posY, type);
            sprite.setOrigin(0.5);
            sprite.setDisplaySize(from, from);
            sprite.setInteractive();
            sprite.setDepth(5);

            await tweenPromise(this, {
                targets: sprite,
                duration: 300,
                angle: 360,
                ease: "Back.Out",
                onUpdate: (tween) => {
                    const t = tween.progress;
                    const size = Phaser.Math.Linear(from, to, t);
                    sprite.setDisplaySize(size, size);
                },
                onComplete: () => {
                    sprite.setAngle(0);
                    sprite.setDisplaySize(to, to);
                },
            });
        } else {
            sprite = this.add.sprite(posX, posY, type);
            sprite.setOrigin(0.5);
            sprite.setDisplaySize(cellSize * 0.6, cellSize * 0.6); // начальный размер
            sprite.setInteractive();
            sprite.setDepth(5);
        }

        sprite.setData("gridX", x);
        sprite.setData("gridY", y);
        sprite.setData("type", type);
        sprite.setData("isHelper", true);
        sprite.setData("helperType", type);

        this.setupPointerEvents(sprite);
        this.grid[y][x] = sprite;

        if (sprite instanceof Phaser.GameObjects.Container) {
            const targets = sprite.list.filter(
                (child) => "setDisplaySize" in child
            ) as Phaser.GameObjects.Sprite[];

            const toW = 34 * dpr;
            const toH = 15 * dpr;

            for (const rocket of targets) {
                this.tweens.add({
                    targets: rocket,
                    displayWidth: toW,
                    displayHeight: toH,
                    duration: 200,
                    ease: "Back.Out",
                });
            }

            await delayPromise(this, 200);
        } else if (type !== "discoball") {
            const from = cellSize * 0.6;
            const to = cellSize;

            await tweenPromise(this, {
                targets: sprite,
                duration: 200,
                ease: "Back.Out",
                onUpdate: (tween) => {
                    const t = tween.progress;
                    const size = Phaser.Math.Linear(from, to, t);
                    (sprite as Phaser.GameObjects.Sprite).setDisplaySize(
                        size,
                        size
                    );
                },
                onComplete: () => {
                    (sprite as Phaser.GameObjects.Sprite).setDisplaySize(
                        to,
                        to
                    );
                },
            });
        }
    }

    isHorizontalMatch(match: Phaser.GameObjects.Sprite[]): boolean {
        if (match.length < 2) return false;
        const y = match[0].getData("gridY");
        return match.every((sprite) => sprite.getData("gridY") === y);
    }

    async activateHelperChain(
        helpers: Phaser.GameObjects.Sprite[]
    ): Promise<void> {
        const triggerChain = new Set<Phaser.GameObjects.Sprite>();
        for (const helper of helpers) {
            await this._activateSingleHelper(helper, undefined, triggerChain);
        }

        await delayPromise(this, 100);
        await this.dropTiles();
        await this.fillEmptyTiles();
        await this.processMatchesLoop();
        await this.reshuffleBoardIfNoMoves();
    }

    async _activateSingleHelper(
        sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container,
        tile?: Phaser.GameObjects.Sprite,
        triggerChain?: Set<Phaser.GameObjects.Sprite>
    ): Promise<void> {
        if (useGameStore.getState().remainingMoves >= 0) {
            if (!this.isGloveActive) {
                useGameStore.getState().decreaseMoves();
            }
        }

        this.cameras.main.flash(150, 200, 220, 255);

        const x = sprite.getData("gridX");
        const y = sprite.getData("gridY");
        const type = sprite.getData("helperType");
        const typeToRemove = tile?.getData("type");
        const toRemove: Phaser.GameObjects.Sprite[] = [];

        if (triggerChain?.has(sprite)) return;
        triggerChain?.add(sprite);

        const helpersToActivate: Phaser.GameObjects.Sprite[] = [];
        const damagedIce = new Set<string>();
        const damagedBoxes = new Set<string>();

        const damageIceAt = (
            x: number,
            y: number,
            playIceSoundOnce: () => void
        ): boolean => {
            const tile = this.grid?.[y]?.[x];
            if (!tile) return false;

            const key = `${x},${y}`;
            if (damagedIce.has(key)) return false;

            const ice = tile.getData("ice");
            const iceSprite = tile.getData("iceSprite");
            if (!ice) return false;

            damagedIce.add(key);

            playIceSoundOnce();
            if (ice.strength > 1) {
                ice.strength--;
                if (iceSprite) iceSprite.setTexture("ice_cracked");
            } else {
                ice.destroyed = true;
            }

            return true;
        };

        const damageBoxAt = (
            x: number,
            y: number,
            playBoxSoundOnce: () => void
        ): boolean => {
            const tile = this.grid?.[y]?.[x];
            if (!tile) return false;

            const box = tile.getData("box");
            if (!box) return false;

            const key = `${x},${y}`;
            if (damagedBoxes.has(key)) return true;

            damagedBoxes.add(key);
            playBoxSoundOnce();

            if (box.strength > 1) {
                box.strength--;
                tile.setTexture("box_cracked");
            } else {
                if (!tile.getData("__scheduledForDestroy")) {
                    tile.setData("__scheduledForDestroy", true);
                    this.grid[y][x] = null;

                    const targetSize = this.cellSize;

                    this.tweens.add({
                        targets: tile,
                        alpha: 0,
                        duration: 200,
                        ease: "Power2",
                        onUpdate: () => {
                            const progress = tile.alpha;
                            const size = Phaser.Math.Linear(
                                targetSize * 1,
                                targetSize * 0,
                                1 - progress
                            );
                            tile.setDisplaySize(size, size);
                        },
                        onComplete: () => {
                            this.updateGoalProgress(
                                "box_full"
                                // tile.getData("type") + "_full"
                            );
                            this.checkWin();
                            tile.destroy();
                        },
                    });
                }
            }

            return true;
        };

        const triggerHelper = (target: Phaser.GameObjects.Sprite) => {
            helpersToActivate.push(target);
        };

        if (sprite instanceof Phaser.GameObjects.Container) {
            sprite.destroy();
        }

        if (type === "horizontalHelper") {
            await this.launchHorizontalRocketWithDamage(
                sprite,
                x,
                y,
                triggerHelper,
                toRemove,
                damageIceAt,
                damageBoxAt
            );
        } else if (type === "verticalHelper") {
            await this.launchVerticalRocketWithDamage(
                sprite,
                x,
                y,
                triggerHelper,
                toRemove,
                damageIceAt,
                damageBoxAt
            );
        } else if (type === "discoball") {
            // this.sound.play("discoball");
            this.cameras.main.shake(200, 0.02);
            if (!typeToRemove) {
                await tweenPromise(this, {
                    targets: sprite,
                    angle: 360,
                    duration: 400,
                    ease: "Cubic.easeOut",
                });
                sprite.setAngle(0);
                await this.activateDiscoballWithRandomNeighbor(sprite);
            } else {
                await this.removeDiscoTiles(x, y, typeToRemove, sprite);
            }
            return;
        }

        this.grid[y][x] = null;
        toRemove.push(sprite);

        for (const key of damagedIce) {
            const [ix, iy] = key.split(",").map(Number);
            const tile = this.grid?.[iy]?.[ix];
            const ice = tile?.getData("ice");
            const iceSprite = tile?.getData("iceSprite");

            if (ice?.destroyed) {
                if (iceSprite) iceSprite.destroy();
                tile?.setData("ice", null);
                tile?.setData("iceSprite", null);
                tile?.setDepth(5);
            }
        }

        await this.removeTiles(toRemove);

        for (let row of this.grid) {
            for (let tile of row) {
                if (tile?.getData("__scheduledForDestroy")) {
                    tile.data.remove("__scheduledForDestroy");
                }
            }
        }

        for (const helper of helpersToActivate) {
            await this._activateSingleHelper(helper, undefined, triggerChain);
        }

        this.checkWin();
    }

    async launchHorizontalRocketWithDamage(
        origin: Phaser.GameObjects.Container,
        col: number,
        row: number,
        triggerHelper: Function,
        toRemove: Phaser.GameObjects.Sprite[],
        damageIceAt: Function,
        damageBoxAt: Function
    ): Promise<void> {
        // this.sound.play("rocket");
        const cellSize = this.cellSize;
        const spacing = this.gap;
        const baseY = this.offsetY + row * (cellSize + spacing) + cellSize / 2;

        const tweens: Promise<void>[] = [];
        const tilesToDestroyLater: Phaser.GameObjects.Sprite[] = [];

        await tweenPromise(this, {
            targets: origin,
            duration: 100,
            ease: "Power1",
            onUpdate: (tween) => {
                const progress = tween.progress;
                const size = Phaser.Math.Linear(
                    cellSize,
                    cellSize * 1.2,
                    Math.sin(progress * Math.PI)
                );
                origin.setAlpha(1 - progress);
            },
        });

        origin.setAlpha(0);

        const launchRocket = async (startX: number, direction: number) => {
            const rocket = this.add.sprite(startX, baseY, "rocket");
            rocket.setDisplaySize(37 * dpr, 17 * dpr);
            rocket.setOrigin(0.5);
            rocket.setAngle(direction < 0 ? 0 : 180);
            rocket.setDepth(999);

            const rocketTrail = this.add.particles(0, 0, "rocketTrail", {
                speed: 0,
                lifespan: 400,
                frequency: 30,
                quantity: 1,
                scale: { start: 1.3 * dpr, end: 0 },
                alpha: { start: 1, end: 0 },
                blendMode: "ADD",

                rotate: direction < 0 ? 0 : 180,
                angle: direction < 0 ? 180 : 0,
            });
            rocketTrail.setDepth(1000);
            rocketTrail.startFollow(rocket);

            let x = col;

            const playBoxSoundOnce = () => {
                if (!boxDamageSoundPlayed) {
                    boxDamageSoundPlayed = true;
                    // this.sound.play("box");
                }
            };

            const playIceSoundOnce = () => {
                if (!iceDamageSoundPlayed) {
                    iceDamageSoundPlayed = true;
                    // this.sound.play("ice");
                }
            };
            while (x >= 0 && x < this.grid[0].length) {
                const targetX =
                    this.offsetX + x * (cellSize + spacing) + cellSize / 2;

                await tweenPromise(this, {
                    targets: rocket,
                    x: targetX,
                    duration: 20,
                    ease: "Linear",
                });

                const tile = this.grid[row][x];
                if (tile && tile !== origin) {
                    const tx = tile.getData("gridX");
                    const ty = tile.getData("gridY");

                    const boxWasDamaged = damageBoxAt(tx, ty, playBoxSoundOnce);
                    const iceWasDamaged = damageIceAt(tx, ty, playIceSoundOnce);
                    const stillHasBox = tile.getData("box");
                    const stillHasIce = tile.getData("ice");

                    const canRemove =
                        !boxWasDamaged &&
                        !iceWasDamaged &&
                        !stillHasBox &&
                        !stillHasIce;

                    if (canRemove) {
                        if (tile.getData("isHelper")) {
                            triggerHelper(tile);
                        } else {
                            const type = tile.getData("type");

                            const isTarget =
                                type === "box"
                                    ? this.levelConfig.goals.some(
                                          (goal) => goal.type === type + "_full"
                                      )
                                    : this.levelConfig.goals.some(
                                          (goal) => goal.type === type
                                      );

                            if (isTarget && !tile.getData("removing")) {
                                await this.animateAndRemoveMatchesGoals(
                                    tile,
                                    this.cellSize * this.scaleFactor - 5,
                                    tweens,
                                    tilesToDestroyLater
                                );
                                this.updateGoalProgress(tile.getData("type"));
                                this.score += 1;
                                this.updateScore();
                            } else {
                                const originalSize = this.cellSize;
                                tweens.push(
                                    tweenPromise(this, {
                                        targets: tile,
                                        alpha: 0,
                                        duration: 80,
                                        ease: "Power2",
                                        onUpdate: () => {
                                            const progress = tile.alpha;
                                            const size = Phaser.Math.Linear(
                                                originalSize,
                                                0,
                                                1 - progress
                                            );
                                            tile.setDisplaySize(size, size);
                                        },
                                        onComplete: () => {
                                            this.spawnTileParticles(
                                                tile.x,
                                                tile.y,
                                                tile.getData("type")
                                            );
                                            tile.destroy();
                                            this.score += 1;
                                            this.updateScore();
                                        },
                                    })
                                );
                                toRemove.push(tile);
                                this.grid[ty][tx] = null;
                            }
                        }
                    }
                }

                x += direction;
            }

            rocketTrail.stop();
            this.time.delayedCall(300, () => rocketTrail.destroy());
            rocket.destroy();
        };
        let boxDamageSoundPlayed = false;
        let iceDamageSoundPlayed = false;

        await Promise.all([
            launchRocket(
                this.offsetX + col * (cellSize + spacing) + cellSize / 2,
                -1
            ),
            launchRocket(
                this.offsetX + col * (cellSize + spacing) + cellSize / 2,
                1
            ),
        ]);

        await Promise.all(tweens);

        for (const tile of tilesToDestroyLater) {
            tile.destroy();
        }
    }

    async launchVerticalRocketWithDamage(
        origin: Phaser.GameObjects.Container,
        col: number,
        row: number,
        triggerHelper: Function,
        toRemove: Phaser.GameObjects.Sprite[],
        damageIceAt: Function,
        damageBoxAt: Function
    ): Promise<void> {
        // this.sound.play("rocket");
        const cellSize = this.cellSize;
        const spacing = this.gap;
        const baseX = this.offsetX + col * (cellSize + spacing) + cellSize / 2;

        const tweens: Promise<void>[] = [];
        const tilesToDestroyLater: Phaser.GameObjects.Sprite[] = [];

        await tweenPromise(this, {
            targets: origin,
            duration: 100,
            ease: "Power1",
            onUpdate: (tween) => {
                const progress = tween.progress;
                origin.setAlpha(1 - progress);
            },
        });

        origin.setAlpha(0);

        const launchRocket = async (startY: number, direction: number) => {
            const rocket = this.add.sprite(baseX, startY, "rocket");
            rocket.setOrigin(0.5);
            rocket.setDisplaySize(37 * dpr, 17 * dpr);

            rocket.setAngle(direction < 0 ? 90 : -90);
            rocket.setDepth(999);

            const rocketTrail = this.add.particles(0, 0, "rocketTrail", {
                speed: 0,
                lifespan: 300,
                frequency: 30,
                quantity: 1,
                scale: { start: 1.3 * dpr, end: 0 },
                alpha: { start: 1, end: 0 },
                blendMode: "ADD",

                rotate: direction < 0 ? 90 : 270,
            });

            rocketTrail.setDepth(998);
            rocketTrail.startFollow(rocket);

            let y = row;
            const playIceSoundOnce = () => {
                if (!iceDamageSoundPlayed) {
                    iceDamageSoundPlayed = true;
                    // this.sound.play("ice");
                }
            };
            const playBoxSoundOnce = () => {
                if (!boxDamageSoundPlayed) {
                    boxDamageSoundPlayed = true;
                    // this.sound.play("box");
                }
            };

            while (y >= 0 && y < this.grid.length) {
                const targetY =
                    this.offsetY + y * (cellSize + spacing) + cellSize / 2;

                await tweenPromise(this, {
                    targets: rocket,
                    y: targetY,
                    duration: 20,
                    ease: "Linear",
                });

                const tile = this.grid[y][col];
                if (tile && tile !== origin) {
                    const tx = tile.getData("gridX");
                    const ty = tile.getData("gridY");

                    const boxWasDamaged = damageBoxAt(tx, ty, playBoxSoundOnce);
                    const iceWasDamaged = damageIceAt(tx, ty, playIceSoundOnce);
                    const stillHasBox = tile.getData("box");
                    const stillHasIce = tile.getData("ice");

                    const canRemove =
                        !boxWasDamaged &&
                        !iceWasDamaged &&
                        !stillHasBox &&
                        !stillHasIce;

                    if (canRemove) {
                        if (tile.getData("isHelper")) {
                            triggerHelper(tile);
                        } else {
                            const type = tile.getData("type");
                            const isTarget =
                                type === "box"
                                    ? this.levelConfig.goals.some(
                                          (goal) => goal.type === type + "_full"
                                      )
                                    : this.levelConfig.goals.some(
                                          (goal) => goal.type === type
                                      );

                            if (isTarget && !tile.getData("removing")) {
                                await this.animateAndRemoveMatchesGoals(
                                    tile,
                                    this.cellSize * this.scaleFactor - 5,
                                    tweens,
                                    tilesToDestroyLater
                                );
                                this.updateGoalProgress(tile.getData("type"));
                                this.score += 1;
                                this.updateScore();
                            } else {
                                const originalSize = this.cellSize;
                                tweens.push(
                                    tweenPromise(this, {
                                        targets: tile,
                                        alpha: 0,
                                        duration: 80,
                                        ease: "Power2",
                                        onUpdate: () => {
                                            const progress = tile.alpha;
                                            const size = Phaser.Math.Linear(
                                                originalSize,
                                                0,
                                                1 - progress
                                            );
                                            tile.setDisplaySize(size, size);
                                        },
                                        onComplete: () => {
                                            this.spawnTileParticles(
                                                tile.x,
                                                tile.y,
                                                tile.getData("type")
                                            );
                                            tile.destroy();
                                            this.score += 1;
                                            this.updateScore();
                                        },
                                    })
                                );
                                toRemove.push(tile);
                                this.grid[ty][tx] = null;
                            }
                        }
                    }
                }

                y += direction;
            }

            rocketTrail.stop();
            this.time.delayedCall(300, () => rocketTrail.destroy());
            rocket.destroy();
        };

        let boxDamageSoundPlayed = false;
        let iceDamageSoundPlayed = false;
        await Promise.all([
            launchRocket(
                this.offsetY + row * (cellSize + spacing) + cellSize / 2,
                -1
            ),
            launchRocket(
                this.offsetY + row * (cellSize + spacing) + cellSize / 2,
                1
            ),
        ]);

        await Promise.all(tweens);

        for (const tile of tilesToDestroyLater) {
            tile.destroy();
        }
    }

    async activateDiscoballWithRandomNeighbor(
        sprite: Phaser.GameObjects.Sprite
    ): Promise<void> {
        const x = sprite.getData("gridX");
        const y = sprite.getData("gridY");

        const neighbors: Phaser.GameObjects.Sprite[] = [];
        const directions = [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
        ];

        for (const { dx, dy } of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (
                ny >= 0 &&
                ny < this.grid.length &&
                nx >= 0 &&
                nx < this.grid[0].length
            ) {
                const neighbor = this.grid[ny][nx];

                if (!neighbor) continue;

                const neighborType = neighbor.getData("type");
                const isHelper = neighbor.getData("isHelper");

                if (
                    !isHelper &&
                    neighborType &&
                    neighborType !== "box" &&
                    neighborType !== "ice"
                ) {
                    neighbors.push(neighbor);
                }
            }
        }

        let selectedTile: Phaser.GameObjects.Sprite | undefined;

        if (neighbors.length > 0) {
            selectedTile = Phaser.Math.RND.pick(neighbors);
        } else {
            const candidates: Phaser.GameObjects.Sprite[] = [];
            for (let row of this.grid) {
                for (let tile of row) {
                    if (
                        tile &&
                        !tile.getData("isHelper") &&
                        tile.getData("type") &&
                        !tile.getData("box") &&
                        !tile.getData("ice")
                    ) {
                        candidates.push(tile);
                    }
                }
            }

            if (candidates.length > 0) {
                selectedTile = Phaser.Math.RND.pick(candidates);
            }
        }

        if (selectedTile) {
            const cellSize = this.cellSize;

            await tweenPromise(this, {
                targets: selectedTile,
                displayWidth: this.cellSize * 1.2,
                displayHeight: this.cellSize * 1.2,
                duration: 300,
                ease: "Sine.easeInOut",
                yoyo: true,
            });

            selectedTile.setDisplaySize(cellSize, cellSize);

            const finalTypeToRemove = selectedTile.getData("type");
            const centerX = sprite.getData("gridX");
            const centerY = sprite.getData("gridY");

            await this.removeDiscoTiles(
                centerX,
                centerY,
                finalTypeToRemove,
                sprite
            );
        } else {
            console.warn(
                "❗ Не удалось найти соседнюю или случайную фишку для дискошара"
            );
        }
    }

    async removeDiscoTiles(
        centerX: number,
        centerY: number,
        typeToRemove: string,
        discoSprite: Phaser.GameObjects.Sprite
    ): Promise<void> {
        const tweenPromises: Promise<void>[] = [];
        const helpersToActivate: Phaser.GameObjects.Sprite[] = [];
        const damagedIce = new Set<string>();
        const damagedBoxes = new Set<string>();

        const damageIceAt = (x: number, y: number) => {
            const tile = this.grid?.[y]?.[x];
            if (!tile) return;

            const key = `${x},${y}`;
            if (damagedIce.has(key)) return;

            const ice = tile.getData("ice");
            const iceSprite = tile.getData("iceSprite");
            if (!ice) return;

            damagedIce.add(key);

            if (ice.strength > 1) {
                ice.strength--;
                if (iceSprite) iceSprite.setTexture("ice_cracked");
            } else {
                if (iceSprite) iceSprite.destroy();
                tile.setData("ice", null);
                tile.setData("iceSprite", null);
                tile.setDepth(5);
                this.grid[y][x] = tile;
            }
        };

        const damageBoxAt = (x: number, y: number) => {
            const tile = this.grid?.[y]?.[x];
            if (!tile) return;

            const key = `${x},${y}`;
            if (damagedBoxes.has(key)) return;

            const box = tile.getData("box");
            if (!box) return;

            damagedBoxes.add(key);

            const sprite = tile.getData("boxSprite") || tile;

            if (box.strength > 1) {
                box.strength--;
                sprite.setTexture("box_cracked");
            } else {
                const gx = tile.getData("gridX");
                const gy = tile.getData("gridY");

                this.grid[gy][gx] = null;

                tweenPromises.push(
                    tweenPromise(this, {
                        targets: sprite,
                        alpha: 0,
                        duration: 200,
                        ease: "Power2",
                        onUpdate: (tween) => {
                            const progress = 1 - tween.progress;
                            sprite.setDisplaySize(
                                cellSize * progress,
                                cellSize * progress
                            );
                        },
                        onComplete: () => {
                            this.updateGoalProgress(
                                "box_full"
                                // sprite.getData("type") + "_full"
                            );
                            this.checkWin();
                            sprite.destroy();
                        },
                    })
                );
            }
        };

        const matchedTiles: Phaser.GameObjects.Sprite[] = [];

        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid[y].length; x++) {
                const tile = this.grid[y][x];
                if (!tile) continue;

                const tileType = tile.getData("type");
                const isHelper = tile.getData("isHelper");

                if (tileType === typeToRemove) {
                    const ice = tile.getData("ice");
                    if (ice) {
                        damageIceAt(x, y);
                        continue;
                    }

                    const directions = [
                        { dx: -1, dy: 0 },
                        { dx: 1, dy: 0 },
                        { dx: 0, dy: -1 },
                        { dx: 0, dy: 1 },
                    ];
                    for (const { dx, dy } of directions) {
                        damageIceAt(x + dx, y + dy);
                        damageBoxAt(x + dx, y + dy);
                    }

                    if (isHelper) {
                        helpersToActivate.push(tile);
                    } else {
                        matchedTiles.push(tile);
                    }
                }
            }
        }

        const cellSize = this.cellSize;
        const targetSize = cellSize * this.scaleFactor - 5;
        const highlightSize = targetSize * 1.2;

        await Promise.all(
            matchedTiles.map((tile) =>
                tweenPromise(this, {
                    targets: tile,
                    duration: 200,
                    displayWidth: highlightSize,
                    displayHeight: highlightSize,
                    yoyo: true,
                    ease: "Power1",
                    onStart: () => tile.setTint(0xffff00),
                    onComplete: () => {
                        tile.clearTint();
                        tile.setDisplaySize(targetSize, targetSize);
                    },
                })
            )
        );

        matchedTiles.forEach((tile) => {
            this.animateAndRemoveMatchesGoals(
                tile,
                targetSize,
                tweenPromises,
                [],
                true
            );
            this.updateGoalProgress(tile.getData("type"));
        });

        // this.sound.play("remove_tile");
        this.grid[centerY][centerX] = null;

        tweenPromises.push(
            tweenPromise(this, {
                targets: discoSprite,
                duration: 250,
                alpha: 0,
                displayWidth: 0,
                displayHeight: 0,
                ease: "Power2",
                onComplete: () => discoSprite.destroy(),
            })
        );

        await Promise.all(tweenPromises);

        if (helpersToActivate.length > 0) {
            await this.activateHelperChain(helpersToActivate);
            return;
        }

        await this.dropTiles();
        await this.fillEmptyTiles();
        await this.processMatchesLoop();
        await this.reshuffleBoardIfNoMoves();
    }

    async removeTiles(
        tiles: (Phaser.GameObjects.Sprite | Phaser.GameObjects.Container)[]
    ): Promise<void> {
        const tweenPromises: Promise<void>[] = [];

        for (const tile of tiles) {
            tweenPromises.push(
                new Promise<void>((resolve) => {
                    this.tweens.add({
                        targets: tile,
                        displayWidth: 0,
                        displayHeight: 0,
                        alpha: 0,
                        duration: 300,
                        ease: "Power1",
                        onComplete: () => {
                            this.updateGoalProgress(tile.getData("type"));
                            this.checkWin();
                            tile.destroy();
                            resolve();
                        },
                    });
                })
            );

            const iceSprite = tile.getData("iceSprite");
            if (iceSprite) {
                tweenPromises.push(
                    new Promise<void>((resolve) => {
                        this.tweens.add({
                            targets: iceSprite,
                            displayWidth: 0,
                            displayHeight: 0,
                            alpha: 0,
                            duration: 300,
                            ease: "Power1",
                            onComplete: () => {
                                iceSprite.destroy();
                                resolve();
                            },
                        });
                    })
                );
            }
        }

        await Promise.all(tweenPromises);
    }

    hasAvailableMoves(): boolean {
        const rows = this.rows;

        for (let y = 0; y < rows; y++) {
            const row = this.grid[y];
            if (!row) continue;

            const cols = row.length;

            for (let x = 0; x < cols; x++) {
                const tile = row[x];
                if (!tile || tile.getData("ice") || tile.getData("box"))
                    continue;

                if (x < cols - 1) {
                    const right = row[x + 1];
                    if (!right || right.getData("ice") || right.getData("box"))
                        continue;

                    row[x] = right;
                    row[x + 1] = tile;

                    const match = this.findMatches();

                    row[x] = tile;
                    row[x + 1] = right;

                    if (match.length > 0) return true;
                }

                if (y < rows - 1 && this.grid[y + 1]) {
                    const down = this.grid[y + 1][x];
                    if (!down || down.getData("ice") || down.getData("box"))
                        continue;

                    this.grid[y][x] = down;
                    this.grid[y + 1][x] = tile;

                    const match = this.findMatches();

                    this.grid[y][x] = tile;
                    this.grid[y + 1][x] = down;

                    if (match.length > 0) return true;
                }
            }
        }

        return false;
    }

    async reshuffleBoardIfNoMoves(): Promise<void> {
        while (!this.hasAvailableMoves()) {
            console.log("😶 Нет доступных ходов, перезаполняем поле");

            const tweenPromises: Promise<void>[] = [];

            for (let y = 0; y < this.rows; y++) {
                for (let x = 0; x < this.cols; x++) {
                    const tile = this.grid[y][x];
                    if (!tile) continue;

                    if (tile.getData("isHelper")) continue;
                    if (tile.getData("box")) continue;

                    const iceData = tile.getData("ice");
                    if (iceData) {
                        const newType = this.getRandomTile();
                        tile.setTexture(newType);
                        tile.setData("type", newType);
                        tile.setDisplaySize(this.cellSize, this.cellSize);
                        continue;
                    }

                    const tween = new Promise<void>((resolve) => {
                        this.tweens.add({
                            targets: tile,
                            alpha: 0,
                            scale: 0.5,
                            duration: 250,
                            ease: "Cubic.easeInOut",
                            onComplete: () => {
                                tile.destroy();
                                resolve();
                            },
                        });
                    });

                    tweenPromises.push(tween);
                    this.grid[y][x] = null;
                }
            }

            await Promise.all(tweenPromises);
            await this.dropTiles();
            await this.fillEmptyTiles();
        }

        await this.processMatchesLoop();
    }

    async clearBoard(): Promise<void> {
        const tweenPromises: Promise<void>[] = [];

        for (let y = 0; y < this.grid.length; y++) {
            for (let x = 0; x < this.grid[y].length; x++) {
                const tile = this.grid[y][x];
                if (!tile) continue;
                if (tile.getData("ice") || tile.getData("box")) continue;

                const iceSprite = tile.getData("iceSprite");
                this.grid[y][x] = null;

                tweenPromises.push(
                    new Promise<void>((resolve) => {
                        this.tweens.add({
                            targets: tile,
                            displayWidth: 0,
                            displayHeight: 0,
                            alpha: 0,
                            duration: 400,
                            delay: Phaser.Math.Between(0, 300),
                            ease: "Power2",
                            onComplete: () => {
                                tile.destroy();
                                if (iceSprite) {
                                    iceSprite.destroy();
                                    tile.setData("ice", null);
                                    tile.setData("iceSprite", null);
                                }
                                resolve();
                            },
                        });
                    })
                );
            }
        }

        await Promise.all(tweenPromises);
    }

    attachIceToSprite(sprite: Phaser.GameObjects.GameObject, strength: number) {
        const textureKey = strength === 2 ? "ice_full" : "ice_cracked";

        const iceSprite = this.add.sprite(sprite.x, sprite.y, textureKey);
        iceSprite.setOrigin(0.5);
        iceSprite.setDisplaySize(48 * dpr, 48 * dpr);
        iceSprite.setDepth(10);
        iceSprite.setAlpha(0.7);
        iceSprite.disableInteractive();

        sprite.setData("ice", { strength });
        sprite.setData("iceSprite", iceSprite);
    }
    createDoubleRocketVertical(
        x: number,
        y: number,
        initialSize = 34
    ): Phaser.GameObjects.Container {
        console.log("privet");
        const height = initialSize * (15 / 34);

        const rocketLeft = this.add.sprite(-8 * dpr, 0, "rocket");
        rocketLeft.setDisplaySize(initialSize * dpr, height * dpr);
        rocketLeft.setAngle(-90);
        rocketLeft.setOrigin(0.5);

        const rocketRight = this.add.sprite(8 * dpr, 0, "rocket");
        rocketRight.setDisplaySize(initialSize * dpr, height * dpr);
        rocketRight.setAngle(90);
        rocketRight.setOrigin(0.5);

        const container = this.add.container(x, y, [rocketLeft, rocketRight]);
        container.setSize(this.cellSize, this.cellSize);
        container.setDepth(5);

        container.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, this.cellSize, this.cellSize),
            Phaser.Geom.Rectangle.Contains
        );

        container.setData("type", "verticalHelper");
        container.setData("isHelper", true);
        container.setData("helperType", "verticalHelper");

        return container;
    }

    createDoubleRocketHorizontal(
        x: number,
        y: number,
        initialSize = 34
    ): Phaser.GameObjects.Container {
        const height = initialSize * (15 / 34);

        const rocketTop = this.add.sprite(0, 8 * dpr, "rocket");
        rocketTop.setDisplaySize(initialSize * dpr, height * dpr);
        rocketTop.setAngle(0);
        rocketTop.setOrigin(0.5);

        const rocketBottom = this.add.sprite(0, -8 * dpr, "rocket");
        rocketBottom.setDisplaySize(initialSize * dpr, height * dpr);
        rocketBottom.setAngle(180);
        rocketBottom.setOrigin(0.5);

        const container = this.add.container(x, y, [rocketTop, rocketBottom]);
        container.setSize(this.cellSize, this.cellSize);
        container.setDepth(5);

        container.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, this.cellSize, this.cellSize),
            Phaser.Geom.Rectangle.Contains
        );

        container.setData("type", "horizontalHelper");
        container.setData("isHelper", true);
        container.setData("helperType", "horizontalHelper");

        return container;
    }

    calculateScaleFactor(): number {
        const screenWidth = this.cameras.main.width;
        const padding = 20; // по 10px слева и справа
        const availableWidth = screenWidth - padding;

        const cellSize = this.cellSize; // 48
        const gap = this.gap; // 2
        const fieldWidth = 7 * cellSize + 6 * gap;

        return Math.min(1, availableWidth / fieldWidth); // scale не больше 1
    }
    // updateMovesUI() {
    //     const moves = useGameStore.getState().remainingMoves;
    //     this.movesText.setText(`${moves}`);
    // }

    updateScore() {
        this.scoreText.setText(`${this.score}`);
    }
    createGoalsPanel(goals: LevelGoal[]) {
        const panelY = this.offsetY - 60 * dpr;
        const centerX = this.cameras.main.centerX;

        const iconSpacing = 55 * dpr;
        const panelWidth = iconSpacing * goals.length;
        const panelHeight = 58 * dpr;
        const cornerRadius = 16 * dpr;
        const bgKey = `goalsPanelBg_${goals.length}`;

        if (!this.textures.exists(bgKey)) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0x3e140b, 1);
            graphics.fillRoundedRect(
                0,
                0,
                panelWidth,
                panelHeight,
                cornerRadius
            );
            graphics.generateTexture(bgKey, panelWidth, panelHeight);
            graphics.destroy();
        }

        const background = this.add.image(centerX, panelY, bgKey);
        background.setOrigin(0.5);
        background.setDepth(10);

        const totalWidth = (goals.length - 1) * iconSpacing;
        const startX = centerX - totalWidth / 2;

        this.goalIcons = {};

        goals.forEach((goal, index) => {
            const iconX = startX + index * iconSpacing;

            const container = this.add.container(iconX, panelY);
            container.setDepth(11);

            const boxBg = this.add.image(0, 0, "tile_bg");
            boxBg.setDisplaySize(48 * dpr, 48 * dpr);
            boxBg.setOrigin(0.5);

            const icon = this.add.sprite(0, 0, goal.type);
            icon.setDisplaySize(
                this.cellSize - 5 * dpr,
                this.cellSize - 5 * dpr
            );
            icon.setOrigin(0.5);

            const radius = 10 * dpr;
            const circleBg = this.add.graphics();
            circleBg.fillStyle(0xe8d1ae, 1);
            circleBg.fillCircle(radius, radius, radius);
            circleBg.setPosition(8 * dpr, -28 * dpr);
            circleBg.setDepth(12);

            const text = this.add.text(
                18 * dpr,
                -18 * dpr,
                goal.count.toString(),
                {
                    font: `700 ${14 * dpr}px Roboto`,
                    color: "#653E28",
                }
            );
            text.setOrigin(0.5);
            text.setDepth(13);
            text.setResolution(dpr < 2 ? 2 : dpr);

            this.unsubscribeGoals = useGameStore.subscribe(
                (state) =>
                    state.goalsProgress.find((g) => g.type === goal.type)
                        ?.count ?? 0,
                (newCount) => {
                    if (!text || !text.scene || !text.setText) return;
                    text.setText(`${newCount}`);
                }
            );
            container.add([boxBg, icon, circleBg, text]);

            this.goalIcons[goal.type] = {
                icon,
                circle: circleBg,
                text,
                container,
            };
        });
    }

    async updateGoalProgress(type: string) {
        console.log(type);
        const goal = this.goalIcons?.[type];
        if (!goal) return;

        useGameStore.getState().updateGoal(type, 1);

        this.tweens.killTweensOf(goal.circle);
        this.tweens.killTweensOf(goal.text);

        goal.circle.setScale(1);
        goal.text.setScale(1);

        this.tweens.add({
            targets: goal.circle,
            scale: 1.2,
            duration: 100,
            yoyo: true,
            ease: "Quad.easeInOut",
        });

        this.tweens.add({
            targets: goal.text,
            scale: 1.2,
            duration: 100,
            yoyo: true,
            ease: "Quad.easeInOut",
        });
    }

    checkGoalsCompleted(): boolean {
        return useGameStore
            .getState()
            .goalsProgress.every((goal) => goal.count === 0);
    }

    handleLevelWin() {
        if (this.levelCompleted) return;
        this.levelCompleted = true;
        useGameStore.getState().setScore(this.score);
        this.scene.stop("Game");
        this.scene.start("MainMenu");
        // this.scene.start("WinScene", {
        //     levelId: this.levelConfig.id,
        //     difficult: this.levelConfig.difficult,
        // });
    }
    handleLevelLose() {
        this.scene.start("LoseScene", { config: this.levelConfig });
    }
    async checkWin() {
        if (useGameStore.getState().remainingMoves > 0) {
            if (this.checkGoalsCompleted()) {
                await this.playRemainingMovesBonus();
                this.handleLevelWin();
            }
            return;
        }

        await this.waitForProcessingComplete();

        if (this.checkGoalsCompleted()) {
            await this.playRemainingMovesBonus();
            this.handleLevelWin();
        } else {
            this.handleLevelLose();
        }
    }

    waitForProcessingComplete(): Promise<void> {
        return new Promise((resolve) => {
            const check = () => {
                if (!this.isProcessing) {
                    resolve();
                } else {
                    this.time.delayedCall(100, check);
                }
            };
            check();
        });
    }

    async playRemainingMovesBonus() {
        while (useGameStore.getState().remainingMoves > 0) {
            useGameStore.getState().decreaseMoves();
            this.score += 5;
            this.updateScore();

            await this.delay(1000);
        }
    }

    delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    createBoostersPanel() {
        interface BageContent {
            bg: string;
            text: string;
            textColor: string;
        }

        const getBageContent = (booster: Booster): BageContent => {
            const bg = booster.count > 0 ? "boosterCount_bg" : "boosterBuy_btn";
            const text = booster.count > 0 ? String(booster.count) : "+";
            const textColor = booster.count > 0 ? "#653E28" : "#FFFFFF";
            return { bg, text, textColor };
        };

        this.boosterContainers = {};

        const boosterData = useGameStore.getState().profile.boosters;

        const spacing = 90 * dpr;
        const totalWidth = spacing * boosterData.length;
        const startX = this.cameras.main.centerX - totalWidth / 2 + spacing / 2;

        const y =
            this.cameras.main.centerY +
            (this.rows * this.cellSize) / 2 +
            spacing / 2 +
            40 * dpr;

        boosterData.forEach((booster, index) => {
            const bageContent: BageContent = getBageContent(booster);

            const x = startX + index * spacing;

            const container = this.add.container(x, y);
            container.setDepth(100);

            const icon = this.add.image(0, 0, booster.type);
            icon.setOrigin(0.5);
            icon.setScale(0.357 * dpr);
            icon.setInteractive({ useHandCursor: true });
            icon.setDepth(101);

            const badgeBg = this.add.image(20 * dpr, 20 * dpr, bageContent.bg);
            badgeBg.setScale(0.357 * dpr);
            badgeBg.setOrigin(0.5);
            badgeBg.setDepth(102);

            const badgeText = this.add.text(
                20 * dpr,
                20 * dpr,
                bageContent.text,
                {
                    font: `700 ${16 * dpr}px Roboto`,
                    color: bageContent.textColor,
                }
            );
            badgeText.setOrigin(0.5);
            badgeText.setName("badgeText");
            badgeText.setResolution(dpr < 2 ? 2 : dpr);
            badgeText.setDepth(103);
            this.unsubscribeBoosters = useGameStore.subscribe(
                (state) =>
                    state.profile.boosters.find((b) => b.type === booster.type)
                        ?.count ?? 0,
                (newCount) => {
                    console.log(newCount);
                    if (!badgeText || !badgeText.scene || !badgeText.setText)
                        return;
                    if (newCount > 0) {
                        badgeText.setText(`${newCount}`);
                        badgeText.setColor("#653E28");
                        badgeBg.setTexture("boosterCount_bg");
                    } else {
                        badgeText.setText(`+`);
                        badgeText.setColor("#FFFFFF");
                        badgeBg.setTexture("boosterBuy_btn");
                    }
                }
            );

            const boosterBg = this.add.image(0, 0, "booster_bg");
            boosterBg.setOrigin(0.5);
            boosterBg.setDepth(100);
            boosterBg.setScale(0.357 * dpr);

            container.add([boosterBg, icon, badgeBg, badgeText]);
            this.boosterContainers[booster.type] = container;

            if (booster.type === "booster_wand") {
                icon.on("pointerdown", () => {
                    const boosterCount =
                        useGameStore
                            .getState()
                            .profile.boosters.find(
                                (b) => b.type === booster.type
                            )?.count ?? 0;
                    if (boosterCount <= 0) {
                        this.buyBooster(booster.type);
                        return;
                    }

                    if (this.isWandActive) {
                        this.isWandActive = false;
                        this.clearActiveBoosterVisual();
                        return;
                    }

                    this.clearActiveBoosterVisual();

                    this.isWandActive = true;
                    this.activeBoosterIcon = icon;

                    this.activeBoosterTween = this.tweens.add({
                        targets: icon,
                        scaleX: 0.4 * dpr,
                        scaleY: 0.4 * dpr,
                        duration: 300,
                        ease: "Sine.easeInOut",
                        yoyo: true,
                        repeat: -1,
                    });
                });
            }

            if (booster.type === "booster_hammer") {
                icon.on("pointerdown", () => {
                    const boosterCount =
                        useGameStore
                            .getState()
                            .profile.boosters.find(
                                (b) => b.type === booster.type
                            )?.count ?? 0;
                    console.log(boosterCount);
                    console.log("booster_hammer");
                    if (boosterCount <= 0) {
                        this.buyBooster(booster.type);
                        return;
                    }

                    if (this.isHammerActive) {
                        this.isHammerActive = false;
                        this.clearActiveBoosterVisual();
                        return;
                    }

                    this.clearActiveBoosterVisual();

                    this.isHammerActive = true;
                    this.activeBoosterIcon = icon;

                    this.activeBoosterTween = this.tweens.add({
                        targets: icon,
                        scaleX: 0.4 * dpr,
                        scaleY: 0.4 * dpr,
                        duration: 300,
                        ease: "Sine.easeInOut",
                        yoyo: true,
                        repeat: -1,
                    });
                });
            }

            if (booster.type === "booster_glove") {
                icon.on("pointerdown", () => {
                    const boosterCount =
                        useGameStore
                            .getState()
                            .profile.boosters.find(
                                (b) => b.type === booster.type
                            )?.count ?? 0;
                    if (boosterCount <= 0) {
                        this.buyBooster(booster.type);
                        return;
                    }

                    if (this.isGloveActive) {
                        this.isGloveActive = false;
                        this.clearActiveBoosterVisual();
                        return;
                    }

                    this.clearActiveBoosterVisual();

                    this.isGloveActive = true;
                    this.activeBoosterIcon = icon;

                    this.activeBoosterTween = this.tweens.add({
                        targets: icon,
                        scaleX: 0.4 * dpr,
                        scaleY: 0.4 * dpr,
                        duration: 300,
                        ease: "Sine.easeInOut",
                        yoyo: true,
                        repeat: -1,
                    });
                });
            }
        });
    }

    async useWandOnTile(tile: Phaser.GameObjects.Sprite) {
        if (
            !tile ||
            typeof tile.getData !== "function" ||
            tile.getData("isHelper")
        )
            return;

        const x = tile.getData("gridX");
        const y = tile.getData("gridY");

        const ice = tile.getData("ice");
        const iceSprite = tile.getData("iceSprite");

        if (ice) {
            await this.playWandEffectToTile(tile);
            if (ice.strength > 1) {
                ice.strength--;
                if (iceSprite) iceSprite.setTexture("ice_cracked");
            } else {
                if (iceSprite) iceSprite.destroy();
                tile.setData("ice", null);
                tile.setData("iceSprite", null);
            }

            // this.decreaseBoosterCount("booster_wand");
            useGameStore.getState().decreaseBoosterCount("booster_wand");
            return;
        }

        const box = tile.getData("box");
        if (box) {
            await this.playWandEffectToTile(tile);
            const sprite = tile.getData("boxSprite") || tile;
            if (box.strength > 1) {
                box.strength--;
                sprite.setTexture("box_cracked");
            } else {
                const tweens: Promise<void>[] = [];
                const tilesToDestroyLater: Phaser.GameObjects.Sprite[] = [];

                await this.animateAndRemoveMatchesGoals(
                    sprite,
                    this.cellSize,
                    tweens,
                    tilesToDestroyLater
                );
                this.updateGoalProgress(sprite.getData("type"));

                await Promise.all(tweens);
                tilesToDestroyLater.forEach((t) => t.destroy());

                this.grid[y][x] = null;

                await this.dropTiles();
                await this.fillEmptyTiles();
                await this.processMatchesLoop();
            }

            // this.decreaseBoosterCount("booster_wand");
            useGameStore.getState().decreaseBoosterCount("booster_wand");
            return;
        }

        if (!tile.getData("isHelper")) {
            await this.playWandEffectToTile(tile);
            const tweens: Promise<void>[] = [];
            const tilesToDestroyLater: Phaser.GameObjects.Sprite[] = [];

            await this.animateAndRemoveMatchesGoals(
                tile,
                this.cellSize,
                tweens,
                tilesToDestroyLater
            );
            this.updateGoalProgress(tile.getData("type"));

            await Promise.all(tweens);
            tilesToDestroyLater.forEach((t) => t.destroy());

            this.grid[y][x] = null;

            // this.decreaseBoosterCount("booster_wand");
            useGameStore.getState().decreaseBoosterCount("booster_wand");
            this.score += 1;
            this.updateScore();

            await this.dropTiles();
            await this.fillEmptyTiles();
            await this.processMatchesLoop();
        }
    }

    activateWand() {
        this.isWandActive = true;

        this.input.once("pointerdown", (pointer: Phaser.Input.Pointer) => {
            const worldPoint = pointer.positionToCamera(this.cameras.main);
            const x = Math.floor(
                (worldPoint.x - this.offsetX) / (this.cellSize + this.gap)
            );
            const y = Math.floor(
                (worldPoint.y - this.offsetY) / (this.cellSize + this.gap)
            );

            if (this.grid[y]?.[x]) {
                this.isWandActive = false;
                this.useWandOnTile(this.grid[y][x]);
            }
        });
    }



    clearActiveBoosterVisual() {
        if (this.activeBoosterTween) {
            this.activeBoosterTween.stop();
            this.activeBoosterTween = null;
        }

        if (this.activeBoosterIcon) {
            this.activeBoosterIcon.setScale(0.333 * dpr);
            this.activeBoosterIcon = null;
        }

        this.isWandActive = false;
        this.isHammerActive = false;
        this.isGloveActive = false;
    }

    async playWandEffectToTile(
        targetTile: Phaser.GameObjects.Sprite
    ): Promise<void> {
        const boosterContainer = this.boosterContainers?.["booster_wand"];
        if (!boosterContainer) return;

        const icon = boosterContainer.list.find(
            (child) =>
                (child as Phaser.GameObjects.Image).texture?.key ===
                "booster_wand"
        ) as Phaser.GameObjects.Image;

        if (!icon || !targetTile) return;

        const wand = this.add.image(
            icon.getWorldTransformMatrix().tx,
            icon.getWorldTransformMatrix().ty,
            "booster_wand"
        );
        wand.setOrigin(0.5);
        wand.setDepth(1000);
        wand.setScale(0.333 * dpr);

        const targetX = targetTile.x;
        const targetY = targetTile.y;

        await tweenPromise(this, {
            targets: wand,
            x: targetX,
            y: targetY,
            scale: 0.333 * dpr,
            alpha: 0.7,
            duration: 300,
            ease: "Cubic.easeInOut",
            onComplete: () => {
                this.cameras.main.flash(150, 200, 220, 255);
            },
        });

        wand.destroy();
    }

    async useHammerOnTile(target: Phaser.GameObjects.Sprite) {
        const row = target.getData("gridY");
        const col = target.getData("gridX");

        const toAffect: Phaser.GameObjects.Sprite[] = [];

        // Строка
        for (let c = 0; c < this.grid[0].length; c++) {
            const t = this.grid[row][c];
            if (t) toAffect.push(t);
        }

        // Колонка
        for (let r = 0; r < this.grid.length; r++) {
            if (r === row) continue;
            const t = this.grid[r][col];
            if (t) toAffect.push(t);
        }

        const tweens: Promise<void>[] = [];
        const tilesToDestroyLater: Phaser.GameObjects.Sprite[] = [];
        const helpersToActivate: Phaser.GameObjects.Sprite[] = [];

        for (const tile of toAffect) {
            const x = tile.getData("gridX");
            const y = tile.getData("gridY");

            const box = tile.getData("box");
            const ice = tile.getData("ice");
            const isHelper = tile.getData("isHelper");

            if (box) {
                const boxData = tile.getData("box");
                if (boxData.strength > 1) {
                    boxData.strength--;
                    const newTexture =
                        boxData.strength === 1 ? "box_cracked" : "box_full";
                    tile.setTexture(newTexture);
                    tile.setData("box", boxData);
                } else {
                    const goal = this.goalIcons?.["box_full"];
                    if (goal) {
                        const clone = this.add.sprite(
                            tile.x,
                            tile.y,
                            "box_cracked"
                        );
                        clone.setDisplaySize(this.cellSize, this.cellSize);
                        clone.setDepth(1000);
                        tile.setVisible(false);

                        tweens.push(
                            tweenPromise(this, {
                                targets: clone,
                                x: goal.icon.x,
                                y: goal.icon.y,
                                scale: 0,
                                alpha: 1,
                                duration: 400,
                                ease: "Cubic.easeIn",
                                onComplete: () => {
                                    this.updateGoalProgress("box_full");
                                    this.checkWin();
                                    clone.destroy();
                                    tile.destroy();

                                    if (this.grid?.[y]?.[x] === tile) {
                                        this.grid[y][x] = null;
                                    }
                                },
                            })
                        );
                    }
                }
                continue;
            }

            if (ice) {
                const iceData = tile.getData("ice");
                const newStrength = iceData.strength - 1;
                tile.setData("ice", { strength: newStrength });

                if (newStrength > 0) {
                    this.updateIceVisual(tile, newStrength);
                } else {
                    this.removeIceVisual(tile);
                    tile.setData("ice", null);
                    tile.setData("iceSprite", null);
                }

                continue;
            }

            if (isHelper) {
                helpersToActivate.push(tile);
                continue;
            }

            const type = tile.getData("type");
            const isTarget = this.levelConfig.goals.some(
                (goal) =>
                    goal.type === type ||
                    (type === "box" && goal.type === "box_full")
            );

            if (isTarget && !tile.getData("removing")) {
                await this.animateAndRemoveMatchesGoals(
                    tile,
                    this.cellSize - 5 * dpr,
                    tweens,
                    tilesToDestroyLater
                );
                this.updateGoalProgress(tile.getData("type"));
                this.score += 1;
                this.updateScore();
            } else {
                const originalSize = this.cellSize;
                tweens.push(
                    tweenPromise(this, {
                        targets: tile,
                        alpha: 0,
                        duration: 80,
                        ease: "Power2",
                        onUpdate: () => {
                            const progress = tile.alpha;
                            const size = Phaser.Math.Linear(
                                originalSize,
                                0,
                                1 - progress
                            );
                            tile.setDisplaySize(size, size);
                        },
                        onComplete: () => {
                            this.spawnTileParticles(tile.x, tile.y, type);
                            tile.destroy();
                            this.grid[y][x] = null;
                            this.score += 1;
                            this.updateScore();
                        },
                    })
                );
            }
        }

        await this.animateHammerStrike(target);

        await Promise.all(tweens);

        for (const tile of tilesToDestroyLater) {
            tile.destroy();
        }

        if (helpersToActivate.length > 0) {
            await this.activateHelperChain(helpersToActivate);
        }

        // this.decreaseBoosterCount("booster_hammer");
        useGameStore.getState().decreaseBoosterCount("booster_hammer");
        await delayPromise(this, 100);
        await this.dropTiles();
        await this.fillEmptyTiles();
        await this.processMatchesLoop();
        await this.reshuffleBoardIfNoMoves();
    }

    async animateHammerStrike(target: Phaser.GameObjects.Sprite) {
        const hammer = this.add.image(
            target.x,
            target.y - 100,
            "booster_hammer"
        );
        hammer.setDepth(1000);

        return new Promise<void>((resolve) => {
            this.tweens.add({
                targets: hammer,
                y: target.y,
                duration: 250,
                ease: "Back.easeOut",
                onComplete: () => {
                    this.cameras.main.flash(150, 200, 220, 255);
                    this.cameras.main.shake(200, 0.02);
                    hammer.destroy();
                    resolve();
                },
            });
        });
    }

    updateIceVisual(tile: Phaser.GameObjects.Sprite, strength: number) {
        const iceSprite = tile.getData("iceSprite");
        if (iceSprite) {
            const texture = strength === 1 ? "ice_cracked" : "ice_full";
            iceSprite.setTexture(texture);
        }
    }

    removeIceVisual(tile: Phaser.GameObjects.Sprite) {
        const iceSprite = tile.getData("iceSprite");
        if (iceSprite) {
            iceSprite.destroy();
        }
        tile.setData("ice", null);
        tile.setData("iceSprite", null);
    }

    buyBooster(booster: string): void {
        this.scene.pause("Game");
        this.scene.launch("BuyBoosters");
    }
    create() {
        this.score = 0;
        this.holePositions = new Set();
        this.isProcessing = false;
        this.isInputLocked = false;
        this.game.renderer.config.antialias = true;

        const ctx = this.game.canvas.getContext("2d");
        if (ctx) {
            ctx.imageSmoothingEnabled = true;
        }

        this.cameras.main.setScroll(0, 0);
        this.cameras.main.fadeIn(1000, 0, 0, 0);
        this.levelCompleted = false;

        const color = {
            message: 0xe7e3de,
            energy: 0xfed26a,
            phone: 0xeb638b,
            smartphone: 0xc6ebf7,
            sim: 0xf7c64c,
            box: 0xe48c32,
        };

        for (const [type, colorHex] of Object.entries(color)) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(colorHex, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture(`particle_${type}`, 8, 8);
            graphics.destroy();
        }

        this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
            if (this.selectedSprite && this.pointerDownPos) {
                const dx = pointer.x - this.pointerDownPos.x;
                const dy = pointer.y - this.pointerDownPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 10) {
                    this.handleTileClick(this.selectedSprite);
                } else {
                    this.handleSwipe(
                        this.selectedSprite,
                        pointer,
                        this.pointerDownPos
                    );
                }

                this.selectedSprite = null;
                this.pointerDownPos = null;
            }
        });

        const levelGrid = this.levelConfig.grid;
        const gap = this.gap;
        const cellSize = this.cellSize;
        const cols = this.cols;
        const rows = this.rows;

        const gridWidth = cols * (cellSize + gap) - gap;
        const gridHeight = rows * (cellSize + gap) - gap;

        const padding = 40 * dpr;
        const availableWidth = this.cameras.main.width - padding;
        const availableHeight = this.cameras.main.height - padding;

        const scaleFactor = Math.min(
            1,
            availableWidth / gridWidth,
            availableHeight / gridHeight
        );
        this.scaleFactor = scaleFactor;

        this.offsetX = (this.cameras.main.width / scaleFactor - gridWidth) / 2;
        this.offsetY =
            (this.cameras.main.height / scaleFactor - gridHeight) / 2;

        this.grid = [];

        const fieldBg = this.add.image(
            this.offsetX + 3 * (cellSize + gap) + cellSize / 2,
            this.offsetY + 3 * (cellSize + gap) + cellSize / 2,
            "field_bg"
        );
        fieldBg.setOrigin(0.5);
        fieldBg.setAlpha(0.8);
        fieldBg.setDisplaySize(gridWidth + 10 * dpr, gridHeight + 10 * dpr);
        fieldBg.setDepth(2);

        const bg = this.add.image(0, 0, "background").setOrigin(0.5, 0.5);
        bg.setPosition(this.cameras.main.centerX, this.cameras.main.centerY);
        const scaleY = this.cameras.main.height / bg.height;
        bg.setScale(scaleY);
        bg.setScrollFactor(0);
        bg.setDepth(1);

        levelGrid.forEach((row, y) => {
            this.grid[y] = [];

            row.forEach((cell, x) => {
                if (!cell) {
                    this.grid[y][x] = null;
                    this.holePositions.add(`${x},${y}`);
                    return;
                }

                const posX = this.offsetX + x * (cellSize + gap) + cellSize / 2;
                const posY = this.offsetY + y * (cellSize + gap) + cellSize / 2;

                const bg = this.add.image(posX, posY, "tile_bg");
                bg.setOrigin(0.5);
                bg.setDisplaySize(cellSize, cellSize);
                bg.setAlpha(0.8);
                bg.setDepth(3);

                if (cell.type === "box") {
                    const strength = cell.strength ?? 2;
                    const texture = strength === 1 ? "box_cracked" : "box_full";

                    const box = this.add.sprite(posX, posY, texture);
                    box.setOrigin(0.5);
                    box.setDisplaySize(cellSize - 5 * dpr, cellSize - 5 * dpr);
                    box.setInteractive();
                    box.setDepth(8);

                    box.setData("gridX", x);
                    box.setData("gridY", y);
                    box.setData("type", "box");
                    box.setData("box", { strength });

                    this.setupPointerEvents(box);

                    this.grid[y][x] = box;
                    return;
                }

                let type = cell.type;
                let data = cell;

                if (cell.type === "ice") {
                    type = cell.content.type;
                    data = {
                        ...cell.content,
                        ice: { strength: cell.strength },
                    };
                }

                if (cell.type === "random") {
                    const randomType = this.getRandomTile();
                    type = randomType;
                    data = {
                        type: randomType,
                        isHelper: false,
                    };
                }
                let sprite:
                    | Phaser.GameObjects.Sprite
                    | Phaser.GameObjects.Container;

                if (data.isHelper && data.helperType === "verticalHelper") {
                    sprite = this.createDoubleRocketVertical(posX, posY);
                } else if (
                    data.isHelper &&
                    data.helperType === "horizontalHelper"
                ) {
                    sprite = this.createDoubleRocketHorizontal(posX, posY);
                } else if (data.isHelper && data.helperType === "discoball") {
                    sprite = this.add.sprite(posX, posY, type);
                    sprite.setOrigin(0.5);
                    sprite.setDisplaySize(
                        cellSize - 5 * dpr,
                        cellSize - 5 * dpr
                    );
                    sprite.setInteractive();
                    sprite.setDepth(5);
                } else {
                    sprite = this.add.sprite(posX, posY, type);
                    sprite.setOrigin(0.5);
                    sprite.setDisplaySize(
                        cellSize - 5 * dpr,
                        cellSize - 5 * dpr
                    );
                    sprite.setInteractive();
                    sprite.setDepth(5);
                }

                sprite.setData("gridX", x);
                sprite.setData("gridY", y);
                sprite.setData("type", type);

                for (const key in data) {
                    sprite.setData(key, data[key]);
                }

                this.setupPointerEvents(sprite);
                this.grid[y][x] = sprite;

                if (cell.type === "ice") {
                    this.attachIceToSprite(sprite, cell.strength);
                }
            });
        });

        this.movesContainer = this.add.container(
            this.offsetX + gridWidth / 2 + 30 * dpr,
            this.offsetY - 154 * dpr
        );
        this.movesContainer.setDepth(100);

        const movesIcon = this.add.text(-10 * dpr, 0, "Ходы:", {
            font: `700 ${18 * dpr}px Roboto`,
            color: "#653E28",
        });
        movesIcon.setOrigin(0.5);
        movesIcon.setResolution(dpr < 2 ? 2 : dpr);
        movesIcon.setDepth(101);

        this.movesText = this.add.text(30 * dpr, 0, "", {
            font: `700 ${18 * dpr}px Roboto`,
            color: "#653E28",
        });
        this.movesText.setOrigin(0.5);
        this.movesText.setResolution(dpr < 2 ? 2 : dpr);
        this.movesText.setDepth(101);

        this.movesText.setText(`${useGameStore.getState().remainingMoves}`);

        this.unsubscribeMoves = useGameStore.subscribe(
            (state) => state.remainingMoves,
            (moves) => {
                this.movesText.setText(`${moves}`);
            }
        );

        const movesBg = this.add.image(0, 0, "moves_bg");
        movesBg.setOrigin(0.5);
        movesBg.setScale(0.357 * dpr);
        movesBg.setDepth(100);

        this.movesContainer.add([movesBg, movesIcon, this.movesText]);

        this.pauseButton = this.add.image(
            this.offsetX + cellSize * cols - cellSize / 2,
            this.offsetY - 154 * dpr,
            "pause_btn"
        );
        this.pauseButton.setOrigin(0.5);
        this.pauseButton.setInteractive({ useHandCursor: true });
        this.pauseButton.setDepth(100);
        this.pauseButton.setDisplaySize(this.cellSize, this.cellSize);
        this.pauseButton.on("pointerdown", () => {
            // this.sound.play("click");

            // this.scene.launch("Pause", {
            //     cellSize: this.cellSize,
            //     offsetX: this.offsetX,
            //     offsetY: this.offsetY,
            //     cols: this.cols,
            // });
            // this.scene.pause("Game");

            useGameStore.getState().setScore(this.score);

            this.scene.stop("Game");
            this.scene.start("MainMenu");
        });

        this.scoreContainer = this.add.container(
            this.offsetX + cellSize + cellSize / 2,
            this.offsetY - 154 * dpr
        );
        this.scoreContainer.setDepth(100);

        const scoreIcon = this.add.image(20 * dpr, 0, "score_icon");
        scoreIcon.setOrigin(0.5);
        scoreIcon.setDisplaySize(48 * dpr, 48 * dpr);
        scoreIcon.setDepth(101);

        this.scoreText = this.add.text(-20 * dpr, 0, `100`, {
            font: `700 ${18 * dpr}px Roboto`,
            color: "#653E28",
        });
        this.scoreText.setOrigin(0.5);
        this.scoreText.setResolution(dpr < 2 ? 2 : dpr);
        this.scoreText.setDepth(101);

        const scoreBg = this.add.image(0, 0, "score_bg");
        scoreBg.setOrigin(0.5);
        scoreBg.setScale(0.357 * dpr);
        scoreBg.setDepth(100);

        this.scoreContainer.add([scoreBg, scoreIcon, this.scoreText]);

        this.createGoalsPanel(this.levelConfig.goals);

        // const logo = this.add.image(
        //     this.cameras.main.centerX,
        //     this.cameras.main.height - 120 * dpr,
        //     "logo"
        // );
        // logo.setOrigin(0.5);
        // logo.setDepth(10);
        // logo.setScale(0.333 * dpr);

        this.createBoostersPanel();
        this.events.once("shutdown", this.handleShutdown, this);
    }

    init(data: { config: LevelConfig }) {
        useGameStore.getState().initLevelState(data.config);
        this.score
        this.levelConfig = data.config;
        this.rows = this.levelConfig.rows;
        this.cols = this.levelConfig.cols;

        this.scaleFactor = 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    handleShutdown() {
        console.log("shutdown");
        this.unsubscribeMoves?.();
        this.unsubscribeGoals?.();
    }
}
