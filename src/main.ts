import { Block, BlockPermutation, BlockType, CommandResult, Direction, ItemUseAfterEvent, ItemUseOnAfterEvent, MinecraftBlockTypes, MolangVariableMap, Player, Vector, Vector3, system, world } from "@minecraft/server";
import { Logger } from "packages";

const logMap: Map<string, number> = new Map<string, number>();

const LadderSupportDirection: Map<number, Vector3> = new Map([
    [2, {x: 0, y: 0, z: -1}], // G
    [3, {x: 0, y: 0, z: 1}], // Good 
    [4, {x: 1, y: 0, z: 0}], // Bad
    [5, {x: -1, y: 0, z: 0}] // B
]);

world.beforeEvents.itemUseOn.subscribe((event: ItemUseOnAfterEvent) => {
    const itemUsed = event.itemStack;
    const player: Player = event.source as Player;
    const _blockPlaced = event.block;
    if(itemUsed.typeId !== "minecraft:ladder") return;
    if(_blockPlaced.typeId !== "minecraft:ladder") return;
    const blockFace = _blockPlaced.permutation.getState("facing_direction")?.valueOf() ?? undefined;
    if(blockFace === undefined) return;
    const oldLog: number = logMap.get(player.name);
    logMap.set(player.name, Date.now());
    if ((oldLog + 150) >= Date.now()) return;
    if(!player.isSneaking) {
        const availableBlock: Block = getBlockFromRayFiltered(_blockPlaced, {x: 0, y: 1, z: 0}, {filteredBlocks: MinecraftBlockTypes.ladder});
        if(!availableBlock) return;
        system.run(async () => {
            const {x, y, z} = availableBlock.location;
            if(!availableBlock.dimension.getBlock({x, y, z}).isAir()) return;
            const directionOffset = LadderSupportDirection.get(blockFace as number);
            const supportOffset: Vector3 = {
                x: availableBlock.location.x + directionOffset.x,
                y: availableBlock.location.y - directionOffset.y,
                z: availableBlock.location.z - directionOffset.z,
            };
            const supportBlock = _blockPlaced.dimension.getBlock(supportOffset);
            if(supportBlock.isAir()){
                supportBlock.setType(MinecraftBlockTypes.barrier);
            }

            // For above blocks
            await new Promise<void>((resolve) => {
                availableBlock.setType(MinecraftBlockTypes.ladder)
                const perm: BlockPermutation = BlockPermutation.resolve(_blockPlaced.typeId).withState("facing_direction", blockFace);
                availableBlock.setPermutation(perm);
                resolve();
            });
        });
    }
    else if(player.isSneaking) {
        const availableBlock: Block = getBlockFromRayFiltered(_blockPlaced, {x: 0, y: -1, z: 0}, {filteredBlocks: MinecraftBlockTypes.ladder});
        if(!availableBlock) return;
        system.run(async () => {
            const {x, y, z} = availableBlock.location;
            if(!availableBlock.dimension.getBlock({x, y, z}).isAir()) return;
            const directionOffset = LadderSupportDirection.get(blockFace as number);
            const supportOffset: Vector3 = {
                x: availableBlock.location.x + directionOffset.x,
                y: availableBlock.location.y - directionOffset.y,
                z: availableBlock.location.z - directionOffset.z,
            };
            const supportBlock = _blockPlaced.dimension.getBlock(supportOffset);
            if(supportBlock.isAir()){
                supportBlock.setType(MinecraftBlockTypes.barrier);
            }

            // For above blocks
            await new Promise<void>((resolve) => {
                availableBlock.setType(MinecraftBlockTypes.ladder)
                const perm: BlockPermutation = BlockPermutation.resolve(_blockPlaced.typeId).withState("facing_direction", blockFace);
                availableBlock.setPermutation(perm);
                resolve();
            });
        });
    }
});

type RayFilterOptions = {
    maxDistance?: number;
    filteredBlocks?: BlockType;
}


/**
 * ? to-do:
 * * It should work for passable blocks {https://minecraft.fandom.com/wiki/Solid_block#List_of_non-solid_blocks}
 */


/**
 * 
 * @param block {Block}
 * @param directionVector {Vector3}
 * @param RayFilterOptions {RayFilterOptions}
 * @returns 
 */
function getBlockFromRayFiltered(block: Block, directionVector: Vector3, RayFilterOptions: RayFilterOptions = {maxDistance: 385}): Block | null {
    let {x, y, z} = block.location;
    const {x: directionX, y: directionY, z: directionZ} = directionVector;
    let blockCheck = 0;
    let newBlock = block.dimension.getBlock({x: x + directionX, y: y + directionY, z: z + directionZ});
    while (true) {
        if(blockCheck > RayFilterOptions.maxDistance) return block;
        if(newBlock.type !== RayFilterOptions.filteredBlocks) break;
        newBlock = block.dimension.getBlock({x, y: y + blockCheck, z});
        blockCheck += directionVector.y;
    }
    return newBlock;
}