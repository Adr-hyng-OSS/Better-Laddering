import { debug } from "packages";

type LogLevel = "info" | "warn" | "error";

class Logger {
  static debug: boolean = true;

  private static log(level: LogLevel, ...data: any[]): void {
    Logger.debug = debug;
    if (!Logger.debug) return;
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

  static info(...data: any[]): void {
    Logger.log("info", ...data);
  }

  static warn(...data: any[]): void {
    Logger.log("warn", ...data);
  }

  static error(...data: any[]): void {
    Logger.log("error", ...data);
  }
}
export {Logger};