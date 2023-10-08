import { BlockPermutation, Direction, EntityEquippableComponent, EntityInventoryComponent, EquipmentSlot, WatchdogTerminateReason, system, world } from "@minecraft/server";
import { MinecraftBlockTypes, MinecraftItemTypes } from "./modules/vanilla-types/index";
import { Compare, LadderSupportDirection, debug, getBlockFromRayFiltered, getCardinalFacing, isInExcludedBlocks, isLadder, isLadderPart, removeCardinalBlockMismatch, resolveBlockFaceDirection, setCardinalBlock, setLadderSupport } from "./packages";
const logMap = new Map();
world.afterEvents.playerBreakBlock;
world.afterEvents.playerBreakBlock.subscribe(async (event) => {
    const blockDestroyed = event.block;
    const blockPermutation = event.brokenBlockPermutation;
    const player = event.player;
    const heldItem = player.getComponent(EntityEquippableComponent.componentId).getEquipment(EquipmentSlot.Mainhand);
    const dimension = event.dimension;
    if (!isLadderPart(blockPermutation.type))
        return;
    if (heldItem?.typeId !== MinecraftBlockTypes.Ladder.id)
        return;
    const inventory = (player.getComponent(EntityInventoryComponent.componentId).container).setHolder(player);
    let laddersDestroyed = 0;
    const blockFace = blockPermutation.getState(Compare.types.isEqual(blockPermutation.type, MinecraftBlockTypes.Ladder) ? "facing_direction" : "yn:facing_direction")?.valueOf() ?? undefined;
    if (blockFace === undefined)
        return;
    const { x, y, z } = blockDestroyed.location;
    const { x: faceX, z: faceZ } = LadderSupportDirection.get(blockFace);
    const CONDITIONAL_BACK_VECTOR = {
        x: x + (-faceX || 0),
        y: y,
        z: z + (-faceZ || 0),
    };
    const isLadderType = isLadder(blockPermutation.type);
    const finalOffset = {
        x: isLadderType ? x : CONDITIONAL_BACK_VECTOR.x,
        y: y,
        z: isLadderType ? z : CONDITIONAL_BACK_VECTOR.z,
    };
    if (!player.isSneaking) {
        const startBlock = dimension.getBlock({ x: finalOffset.x, y: y + 1, z: finalOffset.z });
        if (startBlock.isAir)
            return;
        const lastLadderBlock = getBlockFromRayFiltered(startBlock, { x: 0, y: 1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.Ladder });
        await new Promise((resolve) => {
            const expectedLadderPermutation = BlockPermutation.resolve(MinecraftBlockTypes.Ladder.id).withState("facing_direction", blockFace);
            laddersDestroyed = dimension.fillBlocks(finalOffset, lastLadderBlock.location, MinecraftBlockTypes.Air, { matchingBlock: expectedLadderPermutation });
            resolve();
        });
        inventory.giveItem(MinecraftItemTypes.Ladder, laddersDestroyed);
    }
    else if (player.isSneaking) {
        const startBlock = dimension.getBlock({ x: finalOffset.x, y: y - 1, z: finalOffset.z });
        if (startBlock.isAir)
            return;
        const lastLadderBlock = getBlockFromRayFiltered(startBlock, { x: 0, y: -1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.Ladder });
        await new Promise((resolve) => {
            const expectedLadderPermutation = BlockPermutation.resolve(MinecraftBlockTypes.Ladder.id).withState("facing_direction", blockFace);
            laddersDestroyed = dimension.fillBlocks(finalOffset, lastLadderBlock.location, MinecraftBlockTypes.Air, { matchingBlock: expectedLadderPermutation });
            resolve();
        });
        inventory.giveItem(MinecraftItemTypes.Ladder, laddersDestroyed);
    }
});
world.beforeEvents.itemUseOn.subscribe((event) => {
    let { block: _blockPlaced, itemStack: itemUsed, blockFace: blockInteractedFace } = event;
    const player = event.source;
    if (itemUsed.typeId !== "minecraft:ladder")
        return;
    const oldLog = logMap.get(player.name);
    logMap.set(player.name, Date.now());
    if ((oldLog + 150) >= Date.now())
        return;
    const playerCardinalFacing = getCardinalFacing(player.getRotation().y);
    const { x, y, z } = _blockPlaced.location;
    const inventory = (player.getComponent(EntityInventoryComponent.componentId).container).setHolder(player);
    const preItemAmount = inventory.getItemAmount(MinecraftItemTypes.Ladder);
    system.run(async () => {
        const blockFace = resolveBlockFaceDirection(blockInteractedFace, _blockPlaced, playerCardinalFacing);
        if (Direction.Up === blockInteractedFace && !player.isSneaking) {
            const initialOffset = (_blockPlaced.isSolid || isInExcludedBlocks(_blockPlaced.typeId)) ? 1 : 0;
            _blockPlaced = _blockPlaced.dimension.getBlock({ x, y: y + initialOffset, z });
            if (_blockPlaced.isSolid || isInExcludedBlocks(_blockPlaced.typeId))
                return;
            inventory.clearItem(MinecraftItemTypes.Ladder.id, 1);
            setLadderSupport(_blockPlaced, blockFace);
            await new Promise((resolve) => { setCardinalBlock(_blockPlaced, blockFace, MinecraftBlockTypes.Ladder); resolve(); });
            return;
        }
        else if (Direction.Down === blockInteractedFace) {
            const initialOffset = (_blockPlaced.isSolid || isInExcludedBlocks(_blockPlaced.typeId)) ? 1 : 0;
            _blockPlaced = _blockPlaced.dimension.getBlock({ x, y: y - initialOffset, z });
            if (_blockPlaced.isSolid || isInExcludedBlocks(_blockPlaced.typeId))
                return;
            inventory.clearItem(MinecraftItemTypes.Ladder.id, 1);
            setLadderSupport(_blockPlaced, blockFace);
            await new Promise((resolve) => { setCardinalBlock(_blockPlaced, blockFace, MinecraftBlockTypes.Ladder); resolve(); });
            return;
        }
        else {
            if (!isLadder(_blockPlaced.type))
                return;
            if (blockFace === undefined)
                return;
            if (!player.isSneaking) {
                const availableBlock = getBlockFromRayFiltered(_blockPlaced, { x: 0, y: 1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.Ladder });
                if (!availableBlock)
                    return;
                if (availableBlock.isSolid || isInExcludedBlocks(availableBlock.typeId))
                    return;
                inventory.clearItem(MinecraftItemTypes.Ladder.id, 1);
                if ((preItemAmount - 1) !== inventory.getItemAmount(MinecraftItemTypes.Ladder)) {
                    const mismatchError = removeCardinalBlockMismatch(_blockPlaced, blockFace);
                    if (mismatchError)
                        inventory.giveItem(MinecraftItemTypes.Ladder, mismatchError);
                }
                setLadderSupport(availableBlock, blockFace);
                await new Promise((resolve) => { setCardinalBlock(availableBlock, blockFace, MinecraftBlockTypes.Ladder); resolve(); });
            }
            else if (player.isSneaking) {
                const availableBlock = getBlockFromRayFiltered(_blockPlaced, { x: 0, y: -1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.Ladder });
                if (!availableBlock)
                    return;
                if (availableBlock.isSolid || isInExcludedBlocks(availableBlock.typeId))
                    return;
                inventory.clearItem(MinecraftItemTypes.Ladder.id, 1);
                if ((preItemAmount - 1) !== inventory.getItemAmount(MinecraftItemTypes.Ladder)) {
                    const mismatchError = removeCardinalBlockMismatch(_blockPlaced, blockFace);
                    if (mismatchError)
                        inventory.giveItem(MinecraftItemTypes.Ladder, mismatchError);
                }
                setLadderSupport(availableBlock, blockFace);
                await new Promise((resolve) => { setCardinalBlock(availableBlock, blockFace, MinecraftBlockTypes.Ladder); resolve(); });
            }
        }
    });
});
system.beforeEvents.watchdogTerminate.subscribe((event) => {
    event.cancel = true;
    // When the world just hanged due to lag spike, then just reset the fishers map.
    if (event.terminateReason === WatchdogTerminateReason.Hang) {
        logMap.forEach((value, key) => {
            logMap.set(key, null);
        });
        // For disabling the watchdog custom terminate log.
        if (!debug)
            world.sendMessage({ translate: `BetterLaddering.watchdogError.hang.text` });
        if (debug)
            console.warn("Scripting Error: The script was resetted because it was consuming too much. Please report why this happened to the creator.");
    }
});
