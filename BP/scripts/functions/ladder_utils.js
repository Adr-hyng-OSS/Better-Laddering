import { BlockPermutation, MinecraftBlockTypes, Vector } from "@minecraft/server";
import { disableLadderGriefing, excludedGriefBlocks, includedGriefBlocks } from "../packages";
const LadderSupportDirection = new Map([
    [2, { x: 0, y: 0, z: 1 }],
    [3, { x: 0, y: 0, z: -1 }],
    [4, { x: 1, y: 0, z: 0 }],
    [5, { x: -1, y: 0, z: 0 }]
]);
/**
 *
 * @param block {Block}
 * @param directionVector {Vector3}
 * @param RayFilterOptions {RayFilterOptions}
 * @returns
 */
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
function isInExcludedBlocks(blockID) {
    if (!disableLadderGriefing)
        return false;
    const currentPatterns = [
        '.*_fence',
        '.*_stairs',
        '.*_trapdoor',
        '.*_door',
        '.*_hanging_sign',
        '.*wall_banner',
        'minecraft:mangrove_roots',
        'minecraft:daylight_detector',
        '.*leaves',
        '.*campfire',
        'minecraft:enchanting_table',
        '.*chest',
        '.*portal',
        'minecraft:mob_spawner',
        '.*_wall',
        '.*_slab',
        '.*lantern',
        '^minecraft:stonecutter.*',
        'minecraft:grindstone',
        'minecraft:iron_bars',
        'minecraft:brewing_stand',
        'minecraft:cauldron',
        'minecraft:hopper',
        'minecraft:bell',
        'minecraft:chain',
        '.*azalea',
        'yn:fake_wall_block',
        'minecraft:bed',
    ];
    let patterns = [...currentPatterns, ...includedGriefBlocks];
    patterns = patterns.filter(pattern => !excludedGriefBlocks.includes(pattern));
    const combinedPattern = new RegExp(patterns.join('|'));
    return combinedPattern.test(blockID.replace(/["|']/g, ''));
}
function setCardinalBlock(block, face, blockReplace) {
    const facing_direction_selector = (blockReplace === MinecraftBlockTypes.ladder) ? "facing_direction" : "yn:facing_direction";
    block.setType(blockReplace);
    const perm = BlockPermutation.resolve(block.typeId).withState(facing_direction_selector, face);
    block.setPermutation(perm);
}
function setLadderSupport(block, face) {
    const directionOffset = LadderSupportDirection.get(face);
    const supportOffset = Vector.add(block.location, directionOffset);
    const supportBlock = block.dimension.getBlock(supportOffset);
    if (!supportBlock.isSolid() && !isInExcludedBlocks(supportBlock.typeId)) {
        setCardinalBlock(supportBlock, face, MinecraftBlockTypes.get("yn:fake_wall_block"));
    }
}
const isLadderPart = (blockPlaced) => (blockPlaced.type === MinecraftBlockTypes.ladder || blockPlaced.type === MinecraftBlockTypes.get("yn:fake_wall_block"));
export { getBlockFromRayFiltered, isInExcludedBlocks, LadderSupportDirection, setCardinalBlock, setLadderSupport, isLadderPart };
