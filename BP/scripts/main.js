import { BlockPermutation, Direction, EntityEquipmentInventoryComponent, EntityInventoryComponent, EquipmentSlot, MinecraftBlockTypes, MinecraftItemTypes, system, world } from "@minecraft/server";
import { CContainer, Compare, LadderSupportDirection, Logger, getBlockFromRayFiltered, getCardinalFacing, isInExcludedBlocks, isLadder, isLadderPart, setCardinalBlock, setLadderSupport } from "./packages";
const logMap = new Map();
/**
 * Features:
 * * Currently, it doesn't support not-fully solid block face block, like stairs.
 * * To break all ladders above or below, hold ladder, and destroy a ladder.
 *
 * ? ToDO:
 * * Don't place ladder if there's a block between Other 3 cardinal direction.
 *
 */
world.afterEvents.blockBreak.subscribe(async (event) => {
    const blockDestroyed = event.block;
    const blockPermutation = event.brokenBlockPermutation;
    const player = event.player;
    const heldItem = player.getComponent(EntityEquipmentInventoryComponent.componentId).getEquipment(EquipmentSlot.mainhand);
    const dimension = event.dimension;
    if (!isLadderPart(blockPermutation.type))
        return;
    if (heldItem?.typeId !== MinecraftBlockTypes.ladder.id)
        return;
    const inventory = new CContainer(player.getComponent(EntityInventoryComponent.componentId).container).setPlayer(player);
    let laddersDestroyed = 0;
    const blockFace = blockPermutation.getState(Compare.types.isEqual(blockPermutation.type, MinecraftBlockTypes.ladder) ? "facing_direction" : "yn:facing_direction")?.valueOf() ?? undefined;
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
        if (startBlock.isAir())
            return;
        const lastLadderBlock = getBlockFromRayFiltered(startBlock, { x: 0, y: 1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.ladder });
        await new Promise((resolve) => {
            const expectedLadderPermutation = BlockPermutation.resolve(MinecraftBlockTypes.ladder.id).withState("facing_direction", blockFace);
            laddersDestroyed = dimension.fillBlocks(finalOffset, lastLadderBlock.location, MinecraftBlockTypes.air, { matchingBlock: expectedLadderPermutation });
            resolve();
        });
        inventory.addItem(MinecraftItemTypes.ladder, laddersDestroyed);
    }
    else if (player.isSneaking) {
        const startBlock = dimension.getBlock({ x: finalOffset.x, y: y - 1, z: finalOffset.z });
        if (startBlock.isAir())
            return;
        const lastLadderBlock = getBlockFromRayFiltered(startBlock, { x: 0, y: -1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.ladder });
        await new Promise((resolve) => {
            const expectedLadderPermutation = BlockPermutation.resolve(MinecraftBlockTypes.ladder.id).withState("facing_direction", blockFace);
            laddersDestroyed = dimension.fillBlocks(finalOffset, lastLadderBlock.location, MinecraftBlockTypes.air, { matchingBlock: expectedLadderPermutation });
            resolve();
        });
        inventory.addItem(MinecraftItemTypes.ladder, laddersDestroyed);
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
    const inventory = new CContainer(player.getComponent(EntityInventoryComponent.componentId).container);
    let blockFace = undefined;
    system.run(async () => {
        const resolveBlockFaceDirection = (blockInteractedFace, _blockPlaced, playerCardinalFacing) => {
            const directionMap = {
                [Direction.up]: playerCardinalFacing,
                [Direction.down]: playerCardinalFacing,
                [Direction.east]: undefined,
                [Direction.west]: undefined,
                [Direction.north]: undefined,
                [Direction.south]: undefined
            };
            for (const [direction, defaultValue] of Object.entries(directionMap)) {
                if (blockInteractedFace === direction)
                    return _blockPlaced.permutation.getState("facing_direction")?.valueOf() ?? defaultValue;
            }
        };
        blockFace = resolveBlockFaceDirection(blockInteractedFace, _blockPlaced, playerCardinalFacing);
        if (Direction.up === blockInteractedFace) {
            const initialOffset = (_blockPlaced.isSolid() || isInExcludedBlocks(_blockPlaced.typeId)) ? 1 : 0;
            _blockPlaced = _blockPlaced.dimension.getBlock({ x, y: y + initialOffset, z });
            if (_blockPlaced.isSolid() || isInExcludedBlocks(_blockPlaced.typeId))
                return;
            inventory.clearItem(MinecraftItemTypes.ladder.id, 1);
            setLadderSupport(_blockPlaced, blockFace);
            await new Promise((resolve) => { setCardinalBlock(_blockPlaced, blockFace, MinecraftBlockTypes.ladder); resolve(); });
            return;
        }
        else if (Direction.down === blockInteractedFace) {
            const initialOffset = (_blockPlaced.isSolid() || isInExcludedBlocks(_blockPlaced.typeId)) ? 1 : 0;
            _blockPlaced = _blockPlaced.dimension.getBlock({ x, y: y - initialOffset, z });
            if (_blockPlaced.isSolid() || isInExcludedBlocks(_blockPlaced.typeId))
                return;
            inventory.clearItem(MinecraftItemTypes.ladder.id, 1);
            setLadderSupport(_blockPlaced, blockFace);
            await new Promise((resolve) => { setCardinalBlock(_blockPlaced, blockFace, MinecraftBlockTypes.ladder); resolve(); });
            return;
        }
        else {
            if (!isLadder(_blockPlaced.type))
                return;
            if (blockFace === undefined)
                return;
            if (!player.isSneaking) {
                const availableBlock = getBlockFromRayFiltered(_blockPlaced, { x: 0, y: 1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.ladder });
                if (!availableBlock)
                    return;
                if (availableBlock.isSolid() || isInExcludedBlocks(availableBlock.typeId))
                    return;
                inventory.clearItem(MinecraftItemTypes.ladder.id, 1);
                setLadderSupport(availableBlock, blockFace);
                await new Promise((resolve) => { setCardinalBlock(availableBlock, blockFace, MinecraftBlockTypes.ladder); resolve(); });
            }
            else if (player.isSneaking) {
                const availableBlock = getBlockFromRayFiltered(_blockPlaced, { x: 0, y: -1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.ladder });
                if (!availableBlock)
                    return;
                if (availableBlock.isSolid() || isInExcludedBlocks(availableBlock.typeId))
                    return;
                inventory.clearItem(MinecraftItemTypes.ladder.id, 1);
                setLadderSupport(availableBlock, blockFace);
                await new Promise((resolve) => { setCardinalBlock(availableBlock, blockFace, MinecraftBlockTypes.ladder); resolve(); });
            }
        }
    });
});
world.beforeEvents.chatSend.subscribe((event) => {
    const prefix = "-";
    let player = event.sender;
    let message = event.message;
    const args = message.trim().slice(prefix.length).split(/\s+/g);
    const command = args[0];
    if (command !== "fill")
        return;
    const amountToFill = parseInt(args[1].replace(/[^0-9.-]/g, ''), 10);
    if (isNaN(amountToFill)) {
        Logger.warn('Invalid amount to fill.');
        return;
    }
    let blocksFilled = 0;
    let blockFacing = player.getBlockFromViewDirection({ maxDistance: 10 });
    const { y: yRot } = player.getRotation();
    const playerCardinalFacing = getCardinalFacing(yRot);
    const { x, y, z } = blockFacing.location;
    const initialOffset = blockFacing.isSolid() && !isInExcludedBlocks(blockFacing.typeId) ? 1 : 0;
    blockFacing = blockFacing.dimension.getBlock({ x, y: y + initialOffset, z });
    if (isLadderPart(blockFacing.type) || blockFacing.isSolid() || isInExcludedBlocks(blockFacing.typeId))
        return;
    system.run(async () => {
        setLadderSupport(blockFacing, playerCardinalFacing);
        setCardinalBlock(blockFacing, playerCardinalFacing, MinecraftBlockTypes.ladder);
        await new Promise((resolve) => {
            for (let i = blocksFilled; i < amountToFill; i++) {
                const availableBlock = getBlockFromRayFiltered(blockFacing, { x: 0, y: 1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.ladder });
                if (!availableBlock || availableBlock.isSolid() || isInExcludedBlocks(availableBlock.typeId))
                    return;
                setLadderSupport(availableBlock, playerCardinalFacing);
                setCardinalBlock(availableBlock, playerCardinalFacing, MinecraftBlockTypes.ladder);
                blockFacing = blockFacing.dimension.getBlock({ x, y: blockFacing.y + 1, z });
                blocksFilled++;
            }
            Logger.warn(`Filled ${blocksFilled} blocks.`);
            resolve();
        });
    });
});
