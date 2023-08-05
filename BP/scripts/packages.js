import config from "./config";
export * from "./config";
export * from "./logger";
export * from "./functions/ladder_utils";
export * from "./functions/utils";
const { debug, disableLadderGriefing, excludedBlocksToGrief, includedBlocksToGrief } = config;
export { debug, disableLadderGriefing, excludedBlocksToGrief, includedBlocksToGrief };
