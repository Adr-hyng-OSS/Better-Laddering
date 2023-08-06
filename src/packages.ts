import config from "./config";
export * from "./config";
export * from "./classes/logger";
export * from "./functions/ladder_utils";
export * from "./functions/utils";
export * from "./functions/scripting_utils";



const {
    debug, 
    disableLadderGriefing,
    nonGriefableBlocks,
    griefableBlocks
} = config;


export {debug, disableLadderGriefing, griefableBlocks, nonGriefableBlocks};
