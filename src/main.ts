import { Block, BlockBreakAfterEvent, BlockPermutation, Dimension, Direction, EntityEquipmentInventoryComponent, EntityInventoryComponent, EquipmentSlot, ItemStack, ItemUseOnAfterEvent, MinecraftBlockTypes, MinecraftItemTypes, NumberRange, Player, Vector, Vector3, system, world } from "@minecraft/server";
import { CContainer, Compare, LadderSupportDirection, Logger, getBlockFromRayFiltered, getCardinalFacing, isInExcludedBlocks, isLadder, isLadderPart, setCardinalBlock, setLadderSupport } from "./packages";

const logMap: Map<string, number> = new Map<string, number>();

/**
 * Features:
 * * Currently, it doesn't support not-fully solid block face block, like stairs.
 * * To break all ladders above or below, hold ladder, and destroy a ladder.
 * 
 * ? ToDO:
 * * Don't place ladder if there's a block between Other 3 cardinal direction.
 * 
 */

world.afterEvents.blockBreak.subscribe(async (event: BlockBreakAfterEvent) => {
    const blockDestroyed: Block = event.block;
    const blockPermutation: BlockPermutation = event.brokenBlockPermutation;
    const player: Player = event.player;
    const heldItem: ItemStack = (player.getComponent(EntityEquipmentInventoryComponent.componentId) as EntityEquipmentInventoryComponent).getEquipment(EquipmentSlot.mainhand);
    const dimension: Dimension = event.dimension;
    if(!isLadderPart(blockPermutation.type)) return;
    if(heldItem?.typeId !== MinecraftBlockTypes.ladder.id) return;
		const inventory = new CContainer((player.getComponent(EntityInventoryComponent.componentId) as EntityInventoryComponent).container).setPlayer(player);
		let laddersDestroyed: number = 0;
		const blockFace: number | undefined = (blockPermutation.getState(Compare.types.isEqual(blockPermutation.type, MinecraftBlockTypes.ladder) ? "facing_direction" : "yn:facing_direction")?.valueOf() as number) ?? undefined;
		if(blockFace === undefined) return;

		const {x, y, z} = blockDestroyed.location;
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
		}

    if(!player.isSneaking) {
			const startBlock = dimension.getBlock({x: finalOffset.x, y: y + 1, z: finalOffset.z});
			if(startBlock.isAir()) return;
			const lastLadderBlock: Block = getBlockFromRayFiltered(startBlock, {x: 0, y: 1, z: 0}, {filteredBlocks: MinecraftBlockTypes.ladder});
			await new Promise<void>((resolve) => {
				const expectedLadderPermutation = BlockPermutation.resolve(MinecraftBlockTypes.ladder.id).withState("facing_direction", blockFace);
				laddersDestroyed = dimension.fillBlocks(finalOffset, lastLadderBlock.location, MinecraftBlockTypes.air, {matchingBlock: expectedLadderPermutation}); 
				resolve();
			});
			inventory.addItem(MinecraftItemTypes.ladder, laddersDestroyed);
    }
    else if(player.isSneaking) {
			const startBlock = dimension.getBlock({x: finalOffset.x, y: y - 1, z: finalOffset.z});
			if(startBlock.isAir()) return;
			const lastLadderBlock: Block = getBlockFromRayFiltered(startBlock, {x: 0, y: -1, z: 0}, {filteredBlocks: MinecraftBlockTypes.ladder});
			await new Promise<void>((resolve) => {
				const expectedLadderPermutation = BlockPermutation.resolve(MinecraftBlockTypes.ladder.id).withState("facing_direction", blockFace);
				laddersDestroyed = dimension.fillBlocks(finalOffset, lastLadderBlock.location, MinecraftBlockTypes.air, {matchingBlock: expectedLadderPermutation}); 
				resolve();
			});
			inventory.addItem(MinecraftItemTypes.ladder, laddersDestroyed);
    }
});

world.beforeEvents.itemUseOn.subscribe((event: ItemUseOnAfterEvent) => {
		let {block: _blockPlaced, itemStack: itemUsed, blockFace: blockInteractedFace } = event;
		const player: Player = event.source as Player;

    if(itemUsed.typeId !== "minecraft:ladder") return;
		const oldLog: number = logMap.get(player.name);
    logMap.set(player.name, Date.now());
    if ((oldLog + 150) >= Date.now()) return;
		
		const playerCardinalFacing = getCardinalFacing(player.getRotation().y);
		const {x, y, z} = _blockPlaced.location;
		const inventory = new CContainer((player.getComponent(EntityInventoryComponent.componentId) as EntityInventoryComponent).container);
		system.run(async () => {
			if(Direction.up === blockInteractedFace){
				if(isLadderPart(_blockPlaced.type)) return;
				const initialOffset = _blockPlaced.isSolid() && !isInExcludedBlocks(_blockPlaced.typeId) ? 1 : 0;
				_blockPlaced = _blockPlaced.dimension.getBlock({x, y: y + initialOffset, z});
				if(isLadderPart(_blockPlaced.type)) return;
				if(_blockPlaced.isSolid() || isInExcludedBlocks(_blockPlaced.typeId)) return;
				inventory.clearItem(MinecraftItemTypes.ladder.id, 1);
				setLadderSupport(_blockPlaced, playerCardinalFacing);
				await new Promise<void>((resolve) => {setCardinalBlock(_blockPlaced, playerCardinalFacing, MinecraftBlockTypes.ladder);resolve();});
				return;
			}
			else if(Direction.down === blockInteractedFace){
				if(isLadderPart(_blockPlaced.type)) return;
				const initialOffset = (_blockPlaced.isSolid() && !isInExcludedBlocks(_blockPlaced.typeId)) ? 1 : 0;
				_blockPlaced = _blockPlaced.dimension.getBlock({x, y: y - initialOffset, z});
				if(isLadderPart(_blockPlaced.type)) return;
				if(_blockPlaced.isSolid() || isInExcludedBlocks(_blockPlaced.typeId)) return;
				inventory.clearItem(MinecraftItemTypes.ladder.id, 1);
				setLadderSupport(_blockPlaced, playerCardinalFacing);
				await new Promise<void>((resolve) => {setCardinalBlock(_blockPlaced, playerCardinalFacing, MinecraftBlockTypes.ladder);resolve();});
				return;
			} else {
				if(_blockPlaced.typeId !== "minecraft:ladder") return;
				const blockFace: number = (_blockPlaced.permutation.getState("facing_direction")?.valueOf() as number) ?? undefined;
				if(blockFace === undefined) return;
				if(!player.isSneaking) {
					const availableBlock: Block = getBlockFromRayFiltered(_blockPlaced, {x: 0, y: 1, z: 0}, {filteredBlocks: MinecraftBlockTypes.ladder});
					if(!availableBlock) return;
					if(availableBlock.isSolid() || isInExcludedBlocks(availableBlock.typeId)) return;
					inventory.clearItem(MinecraftItemTypes.ladder.id, 1);
					setLadderSupport(availableBlock, blockFace);
					await new Promise<void>((resolve) => {setCardinalBlock(availableBlock, blockFace, MinecraftBlockTypes.ladder);resolve();});
				}
				else if(player.isSneaking) {
					const availableBlock: Block = getBlockFromRayFiltered(_blockPlaced, {x: 0, y: -1, z: 0}, {filteredBlocks: MinecraftBlockTypes.ladder});
					if(!availableBlock) return;
					if(availableBlock.isSolid() || isInExcludedBlocks(availableBlock.typeId)) return;
					inventory.clearItem(MinecraftItemTypes.ladder.id, 1);
					setLadderSupport(availableBlock, blockFace);
					await new Promise<void>((resolve) => {setCardinalBlock(availableBlock, blockFace, MinecraftBlockTypes.ladder);resolve();});
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
  if (command !== "fill") return;
  
  const amountToFill = parseInt(args[1].replace(/[^0-9.-]/g, ''), 10);
  if (isNaN(amountToFill)) {
    Logger.warn('Invalid amount to fill.');
    return;
  }

  let blocksFilled = 0;
  let blockFacing = player.getBlockFromViewDirection({maxDistance: 10});
  const {y: yRot} = player.getRotation();
  const playerCardinalFacing = getCardinalFacing(yRot);
  const {x, y, z} = blockFacing.location;

  const initialOffset = blockFacing.isSolid() && !isInExcludedBlocks(blockFacing.typeId) ? 1 : 0;
  blockFacing = blockFacing.dimension.getBlock({x, y: y + initialOffset, z});
  if(isLadderPart(blockFacing.type) || blockFacing.isSolid() || isInExcludedBlocks(blockFacing.typeId)) return;
	system.run(async () => {
		setLadderSupport(blockFacing, playerCardinalFacing);
		setCardinalBlock(blockFacing, playerCardinalFacing, MinecraftBlockTypes.ladder);
		
		await new Promise<void>((resolve) => {
			for (let i = blocksFilled; i < amountToFill; i++) {
				const availableBlock: Block = getBlockFromRayFiltered(blockFacing, {x: 0, y: 1, z: 0}, {filteredBlocks: MinecraftBlockTypes.ladder});
				if(!availableBlock || availableBlock.isSolid() || isInExcludedBlocks(availableBlock.typeId)) return;
				
				setLadderSupport(availableBlock, playerCardinalFacing);
				setCardinalBlock(availableBlock, playerCardinalFacing, MinecraftBlockTypes.ladder);
	
				blockFacing = blockFacing.dimension.getBlock({x, y: blockFacing.y + 1, z});
				blocksFilled++;
			}
			Logger.warn(`Filled ${blocksFilled} blocks.`);
			resolve();
		});
	});
});
