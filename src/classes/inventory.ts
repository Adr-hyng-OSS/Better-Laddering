import { Container, EntityEquippableComponent, EquipmentSlot, ItemStack, ItemType, Player } from "@minecraft/server";
import { Logger } from "./logger";

declare module "@minecraft/server" {
    interface Container {
        readonly holder: Player;
        getItemAmount(this: Container, itemToCheck: ItemType): number;
        clearItem(this: Container, itemId: string, decrement: number): boolean;
        giveItem(itemTypeToAdd: ItemType, amount: number): void;
        setHolder(holder: Player): Container;
    }
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

Container.prototype.getItemAmount = function(itemToCheck: ItemType): number {
	let itemAmount = 0;
	for (let i = 0; i < this.size; i++) {
		this
		let item: ItemStack = this.getItem(i);
		if (!item) continue;
		if (item.type !== itemToCheck) continue;
		itemAmount += item.amount;
	}
	return itemAmount;
}

Container.prototype.clearItem = function(itemId: string, decrement: number): boolean {
    const clearSlots = [];
    const equipment = (this.holder.getComponent(EntityEquippableComponent.componentId) as EntityEquippableComponent);
    const offhand = equipment.getEquipment(EquipmentSlot.Offhand);
    for (let i = 0; i < this.size; i++) {
        let item: ItemStack = this.getItem(i);
        if (item?.typeId !== itemId) continue;
        if (decrement - item.amount > 0) {
            decrement -= item.amount;
            clearSlots.push(i);
            continue;
        }; clearSlots.forEach(s => this.setItem(s));
        if (decrement - item.amount === 0) {
            this.setItem(i);
            return true;
        }; item.amount -= decrement;
        this.setItem(i, item);
        return true;
    }; 
    if(offhand?.typeId === itemId) {
        if(offhand?.amount - decrement === 0) {
            equipment.setEquipment(EquipmentSlot.Offhand, undefined);
            return true;
        }
        if(offhand?.amount - decrement > 0) {
            offhand.amount -= decrement;
            equipment.setEquipment(EquipmentSlot.Offhand, offhand);
            return true;
        }
    }
    return false;
}

Container.prototype.setHolder = function(holder: Player): Container {
    this.holder = holder;
    return this;
}

Container.prototype.giveItem = function(itemTypeToAdd: ItemType, amount: number): void {
    if(!amount) return;
    const item = new ItemStack(itemTypeToAdd);
    let exceededAmount: number = 0;
    if(amount > item.maxAmount){
        const groupStacks = stackDistribution(amount, item.maxAmount);
        groupStacks.forEach(stack => {
            item.amount = stack;
            exceededAmount += this.addItem(item)?.amount ?? 0;
        });
    } else {
        item.amount = amount;
        exceededAmount = this.addItem(item)?.amount ?? exceededAmount;
    }
    if(!exceededAmount) return;
    this.holder.dimension.spawnItem(new ItemStack(itemTypeToAdd, exceededAmount), this.holder.location);
}