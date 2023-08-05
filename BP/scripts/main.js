import { BlockPermutation, Direction, EntityEquipmentInventoryComponent, EquipmentSlot, MinecraftBlockTypes, system, world } from "@minecraft/server";
import { Logger, getBlockFromRayFiltered, isInExcludedBlocks, setCardinalBlock, setLadderSupport } from "./packages";
const logMap = new Map();
/**
 * Features:
 * * Currently, it doesn't support not-fully solid block face block, like stairs.
 * * To break all ladders above or below, hold ladder, and destroy a ladder.
 *
 * ? ToDO:
 * * You can put ladders above ceiling, and below floor.
 */
world.afterEvents.blockBreak.subscribe(async (event) => {
    const blockDestroyed = event.block;
    const blockPermutation = event.brokenBlockPermutation;
    const player = event.player;
    const heldItem = player.getComponent(EntityEquipmentInventoryComponent.componentId).getEquipment(EquipmentSlot.mainhand);
    const dimension = event.dimension;
    if (blockPermutation.type.id !== MinecraftBlockTypes.ladder.id)
        return;
    if (heldItem.typeId !== MinecraftBlockTypes.ladder.id)
        return;
    let laddersDestroyed = 0;
    if (!player.isSneaking) {
        const { x, y, z } = blockDestroyed.location;
        const lastLadderBlock = getBlockFromRayFiltered(dimension.getBlock({ x, y: y + 1, z }), { x: 0, y: 1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.ladder });
        await new Promise((resolve) => {
            laddersDestroyed = dimension.fillBlocks(blockDestroyed.location, lastLadderBlock.location, MinecraftBlockTypes.air, { matchingBlock: blockPermutation });
            resolve();
        });
        player.runCommand(`give @s ladder ${laddersDestroyed}`);
    }
    else if (player.isSneaking) {
        const { x, y, z } = blockDestroyed.location;
        const lastLadderBlock = getBlockFromRayFiltered(dimension.getBlock({ x, y: y - 1, z }), { x: 0, y: -1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.ladder });
        await new Promise((resolve) => {
            laddersDestroyed = dimension.fillBlocks(blockDestroyed.location, lastLadderBlock.location, MinecraftBlockTypes.air, { matchingBlock: blockPermutation });
            resolve();
        });
        player.runCommand(`give @s ladder ${laddersDestroyed}`);
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
    Logger.warn("Meow", _blockPlaced.typeId, blockInteractedFace);
    system.run(async () => {
        if (Direction.up === blockInteractedFace) {
            const { x, y, z } = _blockPlaced.location;
            _blockPlaced = _blockPlaced.dimension.getBlock({ x, y: y + 1, z });
            Logger.warn("UP");
            player.runCommand(`clear @s ladder -1 1`);
            await new Promise((resolve) => {
                _blockPlaced.setType(MinecraftBlockTypes.ladder);
                // Use player's angle to determine ladder's facing direction
                const perm = BlockPermutation.resolve(_blockPlaced.typeId).withState("facing_direction", 1);
                _blockPlaced.setPermutation(perm);
                resolve();
            });
            return;
        }
        else if (Direction.down === blockInteractedFace) {
            Logger.warn("DOWN");
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
                    setCardinalBlock(availableBlock, blockFace);
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
                    setCardinalBlock(availableBlock, blockFace);
                    resolve();
                });
            }
        }
    });
});
