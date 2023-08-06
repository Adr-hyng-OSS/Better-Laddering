import { system } from "@minecraft/server";
class ItemStackUtil {
    static isEqual(item1, itemToCompare) {
        return item1 === itemToCompare;
    }
}
class MContainer {
    constructor(inventory) {
        this._inventory = inventory;
    }
    get inventory() {
        return this._inventory;
    }
    set inventory(newInventory) {
        this._inventory = newInventory;
    }
    clearItem(heldItem, decrement) {
        for (let i = 0; i < this._inventory.size; i++) {
            const item = this._inventory.getItem(i);
            if (ItemStackUtil.isEqual(item.type, heldItem))
                continue;
            if (item.amount - decrement <= 0)
                this._inventory.setItem(i);
            else {
                item.amount -= decrement;
                system.run(() => this._inventory.setItem(i, item));
            }
            return true;
        }
        return false;
    }
}
export { MContainer as CInventory };
