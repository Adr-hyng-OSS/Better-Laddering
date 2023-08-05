export default {
  /**
   * Enables debug messages to content logs.
   */
  debug: false,
  /**
   * Allow's ladders to replace non-fully solid face blocks like stairs, doors, etc. Here's a list of blocks that can be forced destroyed when placing ladder above, and back of ladder as support:
   * 1. .*_fence
   * 2. .*_stairs
   * 3. .*_trapdoor
   * 4. .*_door
   * 5. .*_hanging_sign
   * 6. .*wall_banner
   * 7. minecraft:mangrove_roots
   * 8. minecraft:daylight_detector
   * 9. .*leaves
   * 10. .*campfire
   * 11. minecraft:enchanting_table
   * 12. .*chest
   * 13. .*portal
   * 14. minecraft:mob_spawner
   * 15. .*_wall
   * 16. .*_slab
   * 17. .*lantern
   * 18. minecraft:stonecutter.*
   * 19. minecraft:grindstone
   * 20. minecraft:iron_bars
   * 21. minecraft:brewing_stand
   * 22. minecraft:cauldron
   * 23. minecraft:hopper
   * 24. minecraft:bell
   * 25. minecraft:chain
   * 26. .*azalea
   * 27. minecraft:bed
   */
  disableLadderGriefing: true,
  /**
   * List of blocks that you want to be griefed, when disableLadderGriefing is true or ON. (Supports Regex)
   */
  excludedGriefBlocks: [],
  /**
   * List of blocks that you don't want to be griefed, when disableLadderGriefing is true or ON. (Supports Regex)
   */
  includedGriefBlocks: [],
};

// version (do not change)
export const VERSION = "1.0.0";