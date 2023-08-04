import { BlockPermutation, MinecraftBlockTypes, system, world } from "@minecraft/server";
const logMap = new Map();
const LadderSupportDirection = new Map([
    [2, { x: 0, y: 0, z: -1 }],
    [3, { x: 0, y: 0, z: 1 }],
    [4, { x: 1, y: 0, z: 0 }],
    [5, { x: -1, y: 0, z: 0 }]
]);
world.beforeEvents.itemUseOn.subscribe((event) => {
    const itemUsed = event.itemStack;
    const player = event.source;
    const _blockPlaced = event.block;
    if (itemUsed.typeId !== "minecraft:ladder")
        return;
    if (_blockPlaced.typeId !== "minecraft:ladder")
        return;
    const blockFace = _blockPlaced.permutation.getState("facing_direction")?.valueOf() ?? undefined;
    if (blockFace === undefined)
        return;
    const oldLog = logMap.get(player.name);
    logMap.set(player.name, Date.now());
    if ((oldLog + 150) >= Date.now())
        return;
    if (!player.isSneaking) {
        const availableBlock = getBlockFromRayFiltered(_blockPlaced, { x: 0, y: 1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.ladder });
        if (!availableBlock)
            return;
        system.run(async () => {
            const { x, y, z } = availableBlock.location;
            if (!availableBlock.dimension.getBlock({ x, y, z }).isAir())
                return;
            const directionOffset = LadderSupportDirection.get(blockFace);
            const supportOffset = {
                x: availableBlock.location.x + directionOffset.x,
                y: availableBlock.location.y - directionOffset.y,
                z: availableBlock.location.z - directionOffset.z,
            };
            const supportBlock = _blockPlaced.dimension.getBlock(supportOffset);
            if (supportBlock.isAir()) {
                supportBlock.setType(MinecraftBlockTypes.barrier);
            }
            await new Promise((resolve) => {
                availableBlock.setType(MinecraftBlockTypes.ladder);
                const perm = BlockPermutation.resolve(_blockPlaced.typeId).withState("facing_direction", blockFace);
                availableBlock.setPermutation(perm);
                resolve();
            });
        });
    }
    else if (player.isSneaking) {
        const availableBlock = getBlockFromRayFiltered(_blockPlaced, { x: 0, y: -1, z: 0 }, { filteredBlocks: MinecraftBlockTypes.ladder });
        if (!availableBlock)
            return;
        system.run(async () => {
            const { x, y, z } = availableBlock.location;
            if (!availableBlock.dimension.getBlock({ x, y, z }).isAir())
                return;
            const directionOffset = LadderSupportDirection.get(blockFace);
            const supportOffset = {
                x: availableBlock.location.x + directionOffset.x,
                y: availableBlock.location.y - directionOffset.y,
                z: availableBlock.location.z - directionOffset.z,
            };
            const supportBlock = _blockPlaced.dimension.getBlock(supportOffset);
            if (supportBlock.isAir()) {
                supportBlock.setType(MinecraftBlockTypes.barrier);
            }
            await new Promise((resolve) => {
                availableBlock.setType(MinecraftBlockTypes.ladder);
                const perm = BlockPermutation.resolve(_blockPlaced.typeId).withState("facing_direction", blockFace);
                availableBlock.setPermutation(perm);
                resolve();
            });
        });
    }
});
function getBlockFromRayFiltered(block, directionVector, RayFilterOptions = { maxDistance: 385 }) {
    let { x, y, z } = block.location;
    const { x: directionX, y: directionY, z: directionZ } = directionVector;
    let blockCheck = 0;
    let newBlock = block.dimension.getBlock({ x: x + directionX, y: y + directionY, z: z + directionZ });
    while (true) {
        if (blockCheck > RayFilterOptions.maxDistance)
            return block;
        if (newBlock.type !== RayFilterOptions.filteredBlocks)
            break;
        newBlock = block.dimension.getBlock({ x, y: y + blockCheck, z });
        blockCheck += directionVector.y;
    }
    return newBlock;
}
