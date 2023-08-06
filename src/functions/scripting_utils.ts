import { Container, ItemStack, ItemType, system } from "@minecraft/server";
import { Logger } from "packages";

class ItemStackUtil {
    static isEqual(item1: ItemType,itemToCompare: ItemType): boolean {
        return item1 === itemToCompare;
    }
}

class MContainer {
    private _inventory: Container;

    constructor(inventory: Container) {
        this._inventory = inventory;
    }

    get inventory() {
        return this._inventory;
    }

    set inventory(newInventory: Container) {
        this._inventory = newInventory;
    }

    public clearItem(heldItem: ItemType, decrement: number): boolean {
        for (let i = 0; i < this._inventory.size; i++) {
            const item = this._inventory.getItem(i);
            if (ItemStackUtil.isEqual(item.type, heldItem)) continue;
            if (item.amount - decrement <= 0) this._inventory.setItem(i);
            else {
                item.amount -= decrement;
                system.run(() => this._inventory.setItem(i, item));
            }
            return true;
        }
        return false;
    }
}



export {MContainer as CInventory}