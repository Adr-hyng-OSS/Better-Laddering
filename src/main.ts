import { Block, BlockBreakAfterEvent, BlockPermutation, Dimension, Direction, EntityEquipmentInventoryComponent, EquipmentSlot, ItemStack, ItemUseOnAfterEvent, MinecraftBlockTypes, Player, Vector, Vector3, system, world } from "@minecraft/server";
import { Logger, getBlockFromRayFiltered, getCardinalFacing, isInExcludedBlocks, isLadderPart, setCardinalBlock, setLadderSupport } from "./packages";

const logMap: Map<string, number> = new Map<string, number>();

/**
 * Features:
 * * Currently, it doesn't support not-fully solid block face block, like stairs.
 * * To break all ladders above or below, hold ladder, and destroy a ladder.
 * 
 * ? ToDO:
 * * Ladder Support is destroyable like ladder. When you destroy it, it destroys the ladder also.
 */

world.afterEvents.blockBreak.subscribe(async (event: BlockBreakAfterEvent) => {
    const blockDestroyed: Block = event.block;
    const blockPermutation: BlockPermutation = event.brokenBlockPermutation;
    const player: Player = event.player;
    const heldItem: ItemStack = (player.getComponent(EntityEquipmentInventoryComponent.componentId) as EntityEquipmentInventoryComponent).getEquipment(EquipmentSlot.mainhand);
    const dimension: Dimension = event.dimension;
    if(blockPermutation.type.id !== MinecraftBlockTypes.ladder.id) return;
    if(heldItem.typeId !== MinecraftBlockTypes.ladder.id) return;
		let laddersDestroyed: number = 0;
    if(!player.isSneaking) {
        const {x, y, z} = blockDestroyed.location;
        const lastLadderBlock: Block = getBlockFromRayFiltered(dimension.getBlock({x, y: y + 1, z}), {x: 0, y: 1, z: 0}, {filteredBlocks: MinecraftBlockTypes.ladder});
        await new Promise<void>((resolve) => {
            laddersDestroyed = dimension.fillBlocks(blockDestroyed.location, lastLadderBlock.location, MinecraftBlockTypes.air, {matchingBlock: blockPermutation});
            resolve();
        });
				player.runCommand(`give @s ladder ${laddersDestroyed}`);
    }
    else if(player.isSneaking) {
        const {x, y, z} = blockDestroyed.location;
        const lastLadderBlock: Block = getBlockFromRayFiltered(dimension.getBlock({x, y: y - 1, z}), {x: 0, y: -1, z: 0}, {filteredBlocks: MinecraftBlockTypes.ladder});
        await new Promise<void>((resolve) => {
            laddersDestroyed = dimension.fillBlocks(blockDestroyed.location, lastLadderBlock.location, MinecraftBlockTypes.air, {matchingBlock: blockPermutation});
            resolve();
        });
				player.runCommand(`give @s ladder ${laddersDestroyed}`);
    }
});

world.beforeEvents.itemUseOn.subscribe((event: ItemUseOnAfterEvent) => {
    const itemUsed = event.itemStack;
    const player: Player = event.source as Player;
    let _blockPlaced = event.block;
		const blockInteractedFace = event.blockFace;
    if(itemUsed.typeId !== "minecraft:ladder") return;
		const oldLog: number = logMap.get(player.name);
    logMap.set(player.name, Date.now());
    if ((oldLog + 150) >= Date.now()) return;
		const {y: yRot} = player.getRotation();
		const playerCardinalFacing = getCardinalFacing(yRot);
		const {x, y, z} = _blockPlaced.location;
		system.run(async () => {
			if(Direction.up === blockInteractedFace){
				if(isLadderPart(_blockPlaced)) return;
				const initialOffset = _blockPlaced.isSolid() && !isInExcludedBlocks(_blockPlaced.typeId) ? 1 : 0;
				_blockPlaced = _blockPlaced.dimension.getBlock({x, y: y + initialOffset, z});
				if(isLadderPart(_blockPlaced)) return;
				player.runCommand(`clear @s ladder -1 1`);
				setLadderSupport(_blockPlaced, playerCardinalFacing);
				await new Promise<void>((resolve) => {
					setCardinalBlock(_blockPlaced, playerCardinalFacing, MinecraftBlockTypes.ladder);
					resolve();
				});
				return;
			}
			else if(Direction.down === blockInteractedFace){
				if(isLadderPart(_blockPlaced)) return;
				const initialOffset = _blockPlaced.isSolid() && !isInExcludedBlocks(_blockPlaced.typeId) ? 1 : 0;
				_blockPlaced = _blockPlaced.dimension.getBlock({x, y: y - initialOffset, z});
				if(isLadderPart(_blockPlaced)) return;
				player.runCommand(`clear @s ladder -1 1`);
				setLadderSupport(_blockPlaced, playerCardinalFacing);
				await new Promise<void>((resolve) => {
					setCardinalBlock(_blockPlaced, playerCardinalFacing, MinecraftBlockTypes.ladder);
					resolve();
				});
				return;
			} else {
				if(_blockPlaced.typeId !== "minecraft:ladder") return;
				const blockFace: number = (_blockPlaced.permutation.getState("facing_direction")?.valueOf() as number) ?? undefined;
				if(blockFace === undefined) return;
					
				if(!player.isSneaking) {
					const availableBlock: Block = getBlockFromRayFiltered(_blockPlaced, {x: 0, y: 1, z: 0}, {filteredBlocks: MinecraftBlockTypes.ladder});
					if(!availableBlock) return;
					if(availableBlock.isSolid() || isInExcludedBlocks(availableBlock.typeId)) return;
					player.runCommand(`clear @s ladder -1 1`);
					setLadderSupport(availableBlock, blockFace);
					await new Promise<void>((resolve) => {
						setCardinalBlock(availableBlock, blockFace, MinecraftBlockTypes.ladder);
						resolve();
					});
				}
				else if(player.isSneaking) {
					const availableBlock: Block = getBlockFromRayFiltered(_blockPlaced, {x: 0, y: -1, z: 0}, {filteredBlocks: MinecraftBlockTypes.ladder});
					if(!availableBlock) return;
					if(availableBlock.isSolid() || isInExcludedBlocks(availableBlock.typeId)) return;
					player.runCommand(`clear @s ladder -1 1`);
					setLadderSupport(availableBlock, blockFace);
					await new Promise<void>((resolve) => {
						setCardinalBlock(availableBlock, blockFace, MinecraftBlockTypes.ladder);
						resolve();
					});
				}
			}
		});
});