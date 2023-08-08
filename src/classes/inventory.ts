import { Container, ItemStack, ItemType, Player } from "@minecraft/server";
import { Compare } from "../packages";

interface IContainer {
    addItem(itemTypeToAdd: ItemType, amount: number): void;
    clearItem(itemId: string, decrement: number): boolean;
    getItemAmount(itemToCheck: ItemType): number;
}

function stackDistribution(number: number, groupSize: number = 64): number[] {
    // Author: Adr-hyng <https://github.com/Adr-hyng>
    // Project: https://github.com/Adr-hyng-OSS/Lumber-Axe
    const fullGroupsCount = Math.floor(number / groupSize);
    const remainder = number % groupSize;
    // Create an array with the size of each full group
    const groups = new Array(fullGroupsCount).fill(groupSize);
    // If there's a remainder, add it as the last group
    if (remainder > 0) {
        groups.push(remainder);
    }

    return groups;
}



class CContainer implements IContainer {
    private _inventory: Container;
    private _holder: Player;

    constructor(inventory: Container) {
        this._inventory = inventory;
    }

    setPlayer(newHolder: Player): CContainer {
        this._holder = newHolder;
        return this;
    }

    get inventory() {
        return this._inventory;
    }

    set inventory(newInventory: Container) {
        this._inventory = newInventory;
    }

    clearItem(itemId: string, decrement: number): boolean {
        const clearSlots = [];
        for (let i = 0; i < this.inventory.size; i++) {
            let item: ItemStack = this.inventory.getItem(i);
            if (item?.typeId !== itemId) continue;
            if (decrement - item.amount > 0) {
                decrement -= item.amount;
                clearSlots.push(i);
                continue;
            }; clearSlots.forEach(s => this.inventory.setItem(s));
            if (decrement - item.amount === 0) {
                this.inventory.setItem(i);
                return true;
            }; item.amount -= decrement;
            this.inventory.setItem(i, item);
            return true;
        }; return false;
    };

    public addItem(itemTypeToAdd: ItemType, amount: number): void {
        // Author: Adr-hyng <https://github.com/Adr-hyng>
        // Project: https://github.com/Adr-hyng-OSS/Lumber-Axe
        // Behaves similar to "Give" command.
        if(!amount) return;
        const item = new ItemStack(itemTypeToAdd);
        let exceededAmount: number = 0;
        if(amount > item.maxAmount){
            const groupStacks = stackDistribution(amount, item.maxAmount);
            groupStacks.forEach(stack => {
                item.amount = stack;
                exceededAmount += this.inventory.addItem(item)?.amount ?? 0;
            });
        } else {
            item.amount = amount;
            exceededAmount = this.inventory.addItem(item)?.amount ?? exceededAmount;
        }
        if(!exceededAmount) return;
        this._holder.dimension.spawnItem(new ItemStack(itemTypeToAdd, exceededAmount), this._holder.location);
    }
    getItemAmount(itemToCheck: ItemType): number {
        let itemAmount = 0;
        for (let i = 0; i < this.inventory.size; i++) {
            let item: ItemStack = this.inventory.getItem(i);
            if (!item) continue;
            if (!Compare.types.isEqual(item.type, itemToCheck)) continue;
            itemAmount += item.amount;
        }
        return itemAmount;
    };
}



export {CContainer}