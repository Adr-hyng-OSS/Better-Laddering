import { Container, EntityEquippableComponent, EquipmentSlot, ItemStack } from "@minecraft/server";
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
Container.prototype.getItemAmount = function (itemToCheck) {
    let itemAmount = 0;
    for (let i = 0; i < this.size; i++) {
        this;
        let item = this.getItem(i);
        if (!item)
            continue;
        if (item.type !== itemToCheck)
            continue;
        itemAmount += item.amount;
    }
    return itemAmount;
};
Container.prototype.clearItem = function (itemId, decrement) {
    const clearSlots = [];
    const equipment = this.holder.getComponent(EntityEquippableComponent.componentId);
    const offhand = equipment.getEquipment(EquipmentSlot.Offhand);
    for (let i = 0; i < this.size; i++) {
        let item = this.getItem(i);
        if (item?.typeId !== itemId)
            continue;
        if (decrement - item.amount > 0) {
            decrement -= item.amount;
            clearSlots.push(i);
            continue;
        }
        ;
        clearSlots.forEach(s => this.setItem(s));
        if (decrement - item.amount === 0) {
            this.setItem(i);
            return true;
        }
        ;
        item.amount -= decrement;
        this.setItem(i, item);
        return true;
    }
    ;
    if (offhand?.typeId === itemId) {
        if (offhand?.amount - decrement === 0) {
            equipment.setEquipment(EquipmentSlot.Offhand, undefined);
            return true;
        }
        if (offhand?.amount - decrement > 0) {
            offhand.amount -= decrement;
            equipment.setEquipment(EquipmentSlot.Offhand, offhand);
            return true;
        }
    }
    return false;
};
Container.prototype.setHolder = function (holder) {
    this.holder = holder;
    return this;
};
Container.prototype.giveItem = function (itemTypeToAdd, amount) {
    if (!amount)
        return;
    const item = new ItemStack(itemTypeToAdd);
    let exceededAmount = 0;
    if (amount > item.maxAmount) {
        const groupStacks = stackDistribution(amount, item.maxAmount);
        groupStacks.forEach(stack => {
            item.amount = stack;
            exceededAmount += this.addItem(item)?.amount ?? 0;
        });
    }
    else {
        item.amount = amount;
        exceededAmount = this.addItem(item)?.amount ?? exceededAmount;
    }
    if (!exceededAmount)
        return;
    this.holder.dimension.spawnItem(new ItemStack(itemTypeToAdd, exceededAmount), this.holder.location);
};
