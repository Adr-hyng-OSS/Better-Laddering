import { Direction, EntityEquipmentInventoryComponent, EntityInventoryComponent, EquipmentSlot, ItemStack, MinecraftBlockTypes, MinecraftItemTypes, system, world } from "@minecraft/server";
import { getBlockFromRayFiltered, getCardinalFacing, isInExcludedBlocks, isLadderPart, setCardinalBlock, setLadderSupport } from "./packages";
const logMap = new Map();
/**
 * Features:
 * * Currently, it doesn't support not-fully solid block face block, like stairs.
 * * To break all ladders above or below, hold ladder, and destroy a ladder.
 *
 * ? ToDO:
 * * Ladder Support is destroyable like ladder. When you destroy it, it destroys the ladder also.
 *
 */
world.afterEvents.blockBreak.subscribe(async (event) => {
    const blockDestroyed = event.block;
    const blockPermutation = event.brokenBlockPermutation;
    const player = event.player;
    const heldItem = player.getComponent(EntityEquipmentInventoryComponent.componentId).getEquipment(EquipmentSlot.mainhand);
    const dimension = event.dimension;
    if (blockPermutation.type.id !== MinecraftBlockTypes.ladder.id)
        return;
    if (heldItem?.typeId !== MinecraftBlockTypes.ladder.id)
        return;
    let laddersDestroyed = 0;
    const inventory = player.getComponent(EntityInventoryComponent.componentId).container;
    if (!player.isSneaking) {
        const { x, y, z } = blockDestroyed.location;
        const lastLadderBlock = getBlockFromRayFiltered(dimension.getBlock({ x, y: y + 1, z }), { x: 0, y: 1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.ladder });
        await new Promise((resolve) => {
            laddersDestroyed = dimension.fillBlocks(blockDestroyed.location, lastLadderBlock.location, MinecraftBlockTypes.air, { matchingBlock: blockPermutation });
            resolve();
        });
        inventory.addItem(new ItemStack(MinecraftItemTypes.ladder, laddersDestroyed));
        // player.runCommand(`give @s ladder ${laddersDestroyed}`);
    }
    else if (player.isSneaking) {
        const { x, y, z } = blockDestroyed.location;
        const lastLadderBlock = getBlockFromRayFiltered(dimension.getBlock({ x, y: y - 1, z }), { x: 0, y: -1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.ladder });
        await new Promise((resolve) => {
            laddersDestroyed = dimension.fillBlocks(blockDestroyed.location, lastLadderBlock.location, MinecraftBlockTypes.air, { matchingBlock: blockPermutation });
            resolve();
        });
        inventory.addItem(new ItemStack(MinecraftItemTypes.ladder, laddersDestroyed));
    }
});
world.beforeEvents.itemUseOn.subscribe((event) => {
    const itemUsed = event.itemStack;
    const player = event.source;
    let _blockPlaced = event.block;
    const blockInteractedFace = event.blockFace;
    if (itemUsed.typeId !== "minecraft:ladder")
        return;
    const oldLog = logMap.get(player.name);
    logMap.set(player.name, Date.now());
    if ((oldLog + 150) >= Date.now())
        return;
    const { y: yRot } = player.getRotation();
    const playerCardinalFacing = getCardinalFacing(yRot);
    const { x, y, z } = _blockPlaced.location;
    system.run(async () => {
        if (Direction.up === blockInteractedFace) {
            if (isLadderPart(_blockPlaced))
                return;
            const initialOffset = _blockPlaced.isSolid() && !isInExcludedBlocks(_blockPlaced.typeId) ? 1 : 0;
            _blockPlaced = _blockPlaced.dimension.getBlock({ x, y: y + initialOffset, z });
            if (isLadderPart(_blockPlaced))
                return;
            if (_blockPlaced.isSolid() || isInExcludedBlocks(_blockPlaced.typeId))
                return;
            player.runCommand(`clear @s ladder -1 1`);
            setLadderSupport(_blockPlaced, playerCardinalFacing);
            await new Promise((resolve) => {
                setCardinalBlock(_blockPlaced, playerCardinalFacing, MinecraftBlockTypes.ladder);
                resolve();
            });
            return;
        }
        else if (Direction.down === blockInteractedFace) {
            if (isLadderPart(_blockPlaced))
                return;
            const initialOffset = _blockPlaced.isSolid() && !isInExcludedBlocks(_blockPlaced.typeId) ? 1 : 0;
            _blockPlaced = _blockPlaced.dimension.getBlock({ x, y: y - initialOffset, z });
            if (isLadderPart(_blockPlaced))
                return;
            if (_blockPlaced.isSolid() || isInExcludedBlocks(_blockPlaced.typeId))
                return;
            player.runCommand(`clear @s ladder -1 1`);
            setLadderSupport(_blockPlaced, playerCardinalFacing);
            await new Promise((resolve) => {
                setCardinalBlock(_blockPlaced, playerCardinalFacing, MinecraftBlockTypes.ladder);
                resolve();
            });
            return;
        }
        else {
            if (_blockPlaced.typeId !== "minecraft:ladder")
                return;
            const blockFace = _blockPlaced.permutation.getState("facing_direction")?.valueOf() ?? undefined;
            if (blockFace === undefined)
                return;
            if (!player.isSneaking) {
                const availableBlock = getBlockFromRayFiltered(_blockPlaced, { x: 0, y: 1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.ladder });
                if (!availableBlock)
                    return;
                if (availableBlock.isSolid() || isInExcludedBlocks(availableBlock.typeId))
                    return;
                player.runCommand(`clear @s ladder -1 1`);
                setLadderSupport(availableBlock, blockFace);
                await new Promise((resolve) => {
                    setCardinalBlock(availableBlock, blockFace, MinecraftBlockTypes.ladder);
                    resolve();
                });
            }
            else if (player.isSneaking) {
                const availableBlock = getBlockFromRayFiltered(_blockPlaced, { x: 0, y: -1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.ladder });
                if (!availableBlock)
                    return;
                if (availableBlock.isSolid() || isInExcludedBlocks(availableBlock.typeId))
                    return;
                player.runCommand(`clear @s ladder -1 1`);
                setLadderSupport(availableBlock, blockFace);
                await new Promise((resolve) => {
                    setCardinalBlock(availableBlock, blockFace, MinecraftBlockTypes.ladder);
                    resolve();
                });
            }
        }
    });
});
