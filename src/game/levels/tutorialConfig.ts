export interface TutorialGoal {
    type: string;
    count: number;
}

export interface TutorialConfig {
    id: number;
    name: string;
    rows: number;
    cols: number;
    moves: number;
    elements: string[];
    difficult: string;
    goals: LevelGoal[];
    grid: (null | {
        type: string;
        strength?: number;
        content?: { type: string };
    })[][];
    isCompleted: boolean;
}

export const tutorialLevel: TutorialConfig = {
    id: 1,
    name: "Туториал",
    rows: 8,
    cols: 8,
    isCompleted: false,
    moves: 10,
    difficult: "easy",
    elements: ["smartphone", "energy", "sim", "message", "phone"],
    goals: [
        { type: "phone", count: 3 },
        { type: "energy", count: 5 },
        { type: "smartphone", count: 4 },
        { type: "message", count: 5 },
    ],
    grid: [
        [
            { type: "energy" },
            { type: "energy" },
            { type: "smartphone" },
            { type: "message" },
            { type: "sim" },
            { type: "phone" },
            { type: "smartphone" },
            { type: "energy" },
        ],
        [
            { type: "smartphone" },
            { type: "smartphone" },
            { type: "phone" },
            { type: "energy" },
            { type: "smartphone" },
            { type: "phone" },
            { type: "discoball", isHelper: true, helperType: "discoball" },
            { type: "smartphone" },
        ],
        [
            { type: "energy" },
            { type: "energy" },
            { type: "message" },
            { type: "smartphone" },
            { type: "phone" },
            { type: "energy" },
            { type: "energy" },
            { type: "phone" },
        ],
        [
            { type: "energy" },
            { type: "energy" },
            { type: "smartphone" },
            { type: "energy" },
            { type: "energy" },
            { type: "phone" },
            { type: "energy" },
            { type: "message" },
        ],
        [
            { type: "phone" },
            { type: "phone" },
            { type: "smartphone" },
            { type: "phone" },
            { type: "message" },
            { type: "sim" },
            { type: "message" },
            { type: "message" },
        ],
        [
            { type: "energy" },
            { type: "energy" },
            {
                type: "horizontalHelper",
                isHelper: true,
                helperType: "horizontalHelper",
            },
            { type: "sim" },
            { type: "energy" },
            { type: "message" },
            { type: "sim" },
            { type: "sim" },
        ],
        [
            { type: "message" },
            { type: "message" },
            { type: "smartphone" },
            { type: "sim" },
            { type: "smartphone" },
            { type: "sim" },
            { type: "energy" },
            { type: "sim" },
        ],
    ],
};
