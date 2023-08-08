import { Block, BlockPermutation, BlockType, Direction, MinecraftBlockTypes, Vector, Vector3 } from "@minecraft/server";
import { Compare, Logger, disableLadderGriefing, griefableBlocks, nonGriefableBlocks } from "../packages";

const LadderSupportDirection: Map<number, Vector3> = new Map([
    [2, {x: 0, y: 0, z: 1}],
    [3, {x: 0, y: 0, z: -1}],
    [4, {x: 1, y: 0, z: 0}],
    [5, {x: -1, y: 0, z: 0}]
]);

type RayFilterOptions = {
    maxDistance?: number;
    filteredBlocks?: BlockType;
}

/**
 * 
 * @param block {Block}
 * @param directionVector {Vector3}
 * @param RayFilterOptions {RayFilterOptions}
 * @returns {Block | null}
 */
function getBlockFromRayFiltered(block: Block, directionVector: Vector3, RayFilterOptions: RayFilterOptions = {maxDistance: 150}): Block | null {
    let {x, y, z} = block.location;
    const {x: directionX, y: directionY, z: directionZ} = directionVector;
    let blockCheck = 0;
    let newBlock = block.dimension.getBlock({x: x + directionX, y: y + directionY, z: z + directionZ});
    while (true) {
        if(blockCheck > RayFilterOptions.maxDistance) return newBlock;
        if(isOutofBuildLimit(newBlock.location.y)) return newBlock;
        if(newBlock.type !== RayFilterOptions.filteredBlocks) break;
        newBlock = block.dimension.getBlock({x, y: y + blockCheck, z});
        blockCheck += directionVector.y;
    }
    return newBlock;
}

function isInExcludedBlocks(blockID: string): boolean {
	if (!disableLadderGriefing) return false;
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
    'minecraft:ladder',
    'yn:fake_wall_block',
    'minecraft:bed',
  ];

  let patterns: string[] = [...currentPatterns, ...nonGriefableBlocks];
  patterns = patterns.filter(pattern => !griefableBlocks.includes(pattern));
  const combinedPattern = new RegExp(patterns.join('|'));
  return combinedPattern.test(blockID.replace(/["|']/g, ''));
}

function setCardinalBlock(block: Block, face: number, blockReplace: BlockType): void {
    if(isOutofBuildLimit(block.location.y)) {
        throw new Error("Stackable Ladder: Cannot place block out of build limit.");
    }
    const facing_direction_selector = (blockReplace === MinecraftBlockTypes.ladder) ? "facing_direction" : "yn:facing_direction";
    block.setType(blockReplace);
    if(Compare.types.isEqual(block.type, MinecraftBlockTypes.air)) return;
    const perm: BlockPermutation = BlockPermutation.resolve(block.typeId).withState(facing_direction_selector, face);
    block.setPermutation(perm);
}

function setLadderSupport(block: Block, face: number): void {
    const directionOffset = LadderSupportDirection.get(face);
    const supportOffset: Vector3 = Vector.add(block.location, directionOffset);
    const supportBlock = block.dimension.getBlock(supportOffset);
    if(!supportBlock.isSolid() && !isInExcludedBlocks(supportBlock.typeId)){
        setCardinalBlock(supportBlock, face, MinecraftBlockTypes.get("yn:fake_wall_block"));
    }
}
function resolveBlockFaceDirection(blockInteractedFace: Direction, _blockPlaced: Block, playerCardinalFacing: number): number | undefined {
    // Gets the default blockFace to handle up, down, and sides detection to place the ladder depending on what block face the player is looking at
    // or depending on the player's intereacted block, if it is a ladder, then just get that ladder's facing direction.
    const directionMap = {
            [Direction.Up]: playerCardinalFacing,
            [Direction.Down]: playerCardinalFacing,
            [Direction.East]: undefined,
            [Direction.West]: undefined,
            [Direction.North]: undefined,
            [Direction.South]: undefined
    };
    for (const [direction, defaultValue] of Object.entries(directionMap)) {
            if (blockInteractedFace === direction) return (_blockPlaced.permutation.getState("facing_direction")?.valueOf() as number) ?? defaultValue;
    }
}

function removeCardinalBlockMismatch(block: Block, facingDirection: number): number {
    // Not used, but used for clearing up the cardinal block mismatch. (e.g. ladder placed on the side of the wall, then it automatically placed ladder 
    // in other cardinal directions also. Making use of your ladder into such waste.)
    const {x, y, z} = block.location;
    for (const [faceKey, cardinalPosition] of LadderSupportDirection) {
        const {x: x2, y: y2, z: z2} = cardinalPosition;
        if (Compare.types.isEqual(faceKey, facingDirection)) continue;
        const _block: Block = block.dimension.getBlock({x: x + x2, y: y + y2, z: z + z2});
        if(Compare.types.isEqual(_block.type, block.type)) {
            _block.setType(MinecraftBlockTypes.air);
            return 1;
        }
    }
    return 0;
}

const isLadder = (blockPlaced: BlockType) => Compare.types.isEqual(blockPlaced, MinecraftBlockTypes.ladder);

const isLadderPart = (blockPlaced: BlockType) => (Compare.types.isEqual(blockPlaced, MinecraftBlockTypes.ladder) || Compare.types.isEqual(blockPlaced, MinecraftBlockTypes.get("yn:fake_wall_block")));

const isOutofBuildLimit = (y: number): boolean => (y >= 319 || y <= -64);

export {
    getBlockFromRayFiltered, 
    isInExcludedBlocks, 
    LadderSupportDirection, 
    setCardinalBlock, 
    setLadderSupport, 
    isLadderPart, 
    isLadder, 
    isOutofBuildLimit, 
    removeCardinalBlockMismatch, 
    resolveBlockFaceDirection
};