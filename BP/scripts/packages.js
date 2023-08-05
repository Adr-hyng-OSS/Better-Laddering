import config from "./config";
export * from "./config";
export * from "./classes/logger";
export * from "./functions/ladder_utils";
export * from "./functions/utils";
const { debug, disableLadderGriefing, includedGriefBlocks, excludedGriefBlocks } = config;
export { debug, disableLadderGriefing, includedGriefBlocks, excludedGriefBlocks };
