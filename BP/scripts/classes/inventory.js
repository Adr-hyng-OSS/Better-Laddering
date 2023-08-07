import { ItemStack } from "@minecraft/server";
function stackDistribution(number, groupSize = 64) {
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
class CContainer {
    constructor(inventory) {
        this._inventory = inventory;
    }
    setPlayer(newHolder) {
        this._holder = newHolder;
        return this;
    }
    get inventory() {
        return this._inventory;
    }
    set inventory(newInventory) {
        this._inventory = newInventory;
    }
    clearItem(itemId, decrement) {
        const clearSlots = [];
        for (let i = 0; i < this.inventory.size; i++) {
            let item = this.inventory.getItem(i);
            if (item?.typeId !== itemId)
                continue;
            if (decrement - item.amount > 0) {
                decrement -= item.amount;
                clearSlots.push(i);
                continue;
            }
            ;
            clearSlots.forEach(s => this.inventory.setItem(s));
            if (decrement - item.amount === 0) {
                this.inventory.setItem(i);
                return true;
            }
            ;
            item.amount -= decrement;
            this.inventory.setItem(i, item);
            return true;
        }
        ;
        return false;
    }
    ;
    addItem(itemTypeToAdd, amount) {
        // Author: Adr-hyng <https://github.com/Adr-hyng>
        // Project: https://github.com/Adr-hyng-OSS/Lumber-Axe
        // Behaves similar to "Give" command.
        if (!amount)
            return;
        const item = new ItemStack(itemTypeToAdd);
        let exceededAmount = 0;
        if (amount > item.maxAmount) {
            const groupStacks = stackDistribution(amount, item.maxAmount);
            groupStacks.forEach(stack => {
                item.amount = stack;
                exceededAmount += this.inventory.addItem(item)?.amount ?? 0;
            });
        }
        else {
            item.amount = amount;
            exceededAmount = this.inventory.addItem(item)?.amount ?? exceededAmount;
        }
        if (!exceededAmount)
            return;
        this._holder.dimension.spawnItem(new ItemStack(itemTypeToAdd, exceededAmount), this._holder.location);
    }
}
export { CContainer };
