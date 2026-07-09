import { app, crashReporter } from "electron";
import * as path from "path";
import * as fs from "fs";

export function initCrashReporter(): void {
  const crashesDir = path.join(app.getPath("userData"), "crashes");
  if (!fs.existsSync(crashesDir)) {
    fs.mkdirSync(crashesDir, { recursive: true });
  }

  crashReporter.start({
    companyName: "Gnovium",
    productName: "Gnovium",
    submitURL: "",
    uploadToServer: false,
    extra: { crashesDir },
  });

  process.on("uncaughtException", (error: Error) => {
    writeCrashReport(crashesDir, "uncaughtException", error);
    console.error("[CrashReporter] Uncaught exception:", error);
  });

  process.on("unhandledRejection", (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    writeCrashReport(crashesDir, "unhandledRejection", error);
    console.error("[CrashReporter] Unhandled rejection:", error);
  });
}

function writeCrashReport(dir: string, type: string, error: Error): void {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportPath = path.join(dir, `crash-${type}-${timestamp}.json`);
    const report = {
      type,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      appVersion: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  } catch {
  }
}
