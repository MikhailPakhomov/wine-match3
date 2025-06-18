import { Shop } from "./../game/scenes/Shop";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useGameStore } from "./useGameStore";
import { use } from "matter";

export interface Booster {
    type: string;
    qty: number;
    cost: number;
}
interface ShopState {
    products: {
        boosters: Booster[];
    };
    buyBooster: (booster: Booster) => void;
}

export const useShopStore = create<ShopState>()(
    subscribeWithSelector<ShopState>((set) => ({
        products: {
            boosters: [
                { type: "booster_glove", qty: 5, cost: 100 },
                { type: "booster_hammer", qty: 5, cost: 100 },
                { type: "booster_wand", qty: 5, cost: 100 },
            ],
        },
        buyBooster: (booster) => {
            useGameStore
                .getState()
                .increaseBoosterCount(booster.type, booster.qty);
            // useGameStore.getState().decreaseCoins(booster.cost);
        },
    }))
);
