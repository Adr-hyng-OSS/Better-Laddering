import { debug } from "packages";
class Logger {
    static log(level, ...data) {
        Logger.debug = debug;
        if (!Logger.debug)
            return;
        switch (level) {
            case "info":
                console.log(...data);
                break;
            case "warn":
                console.warn(...data);
                break;
            case "error":
                console.error(...data);
                break;
            default:
                console.log(...data);
                break;
        }
    }
    static info(...data) {
        Logger.log("info", ...data);
    }
    static warn(...data) {
        Logger.log("warn", ...data);
    }
    static error(...data) {
        Logger.log("error", ...data);
    }
}
Logger.debug = true;
export { Logger };
