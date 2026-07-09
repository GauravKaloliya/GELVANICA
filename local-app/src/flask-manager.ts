import { spawn, ChildProcess } from "child_process";
import * as path from "path";
import * as http from "http";
import kill from "tree-kill";

const DEFAULT_PORT = 5000;
const HEALTH_ENDPOINT = "/health";
const STARTUP_TIMEOUT_MS = 30_000;
const SHUTDOWN_TIMEOUT_MS = 5_000;

export interface FlaskManagerOptions {
  /** Absolute path to the backend directory containing run.py */
  backendDir: string;
  /** Port Flask should listen on */
  port?: number;
  /** Python executable path (auto-detected if not provided) */
  pythonPath?: string;
}

export class FlaskManager {
  private process: ChildProcess | null = null;
  private readonly backendDir: string;
  private readonly port: number;
  private readonly pythonPath: string;
  private ready = false;
  private logListener: ((line: string) => void) | null = null;

  constructor(options: FlaskManagerOptions) {
    this.backendDir = options.backendDir;
    this.port = options.port ?? DEFAULT_PORT;
    this.pythonPath = options.pythonPath ?? "python";
  }

  /** Register a callback for each line of Flask stdout/stderr output. */
  onLog(listener: (line: string) => void): void {
    this.logListener = listener;
  }

  private emitLog(line: string): void {
    if (this.logListener) {
      this.logListener(line);
    }
  }

  /** Start the Flask backend and wait for it to become healthy. */
  async start(): Promise<number> {
    if (this.process) {
      return this.port;
    }

    const runScript = path.join(this.backendDir, "run.py");

    this.process = spawn(this.pythonPath, [runScript], {
      cwd: this.backendDir,
      env: {
        ...process.env,
        GNOVIUM_MODE: "local",
        FLASK_PORT: String(this.port),
      },
      stdio: ["pipe", "pipe", "pipe"],
      detached: false,
    });

    // Pipe stdout/stderr for debugging (visible in Electron dev console)
    this.process.stdout?.on("data", (data: Buffer) => {
      const text = data.toString().trimEnd();
      console.log(`[Flask] ${text}`);
      this.emitLog(text);
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      const text = data.toString().trimEnd();
      console.error(`[Flask:err] ${text}`);
      this.emitLog(text);
    });

    this.process.on("error", (err) => {
      console.error("[Flask] Failed to start:", err.message);
      this.process = null;
    });

    this.process.on("exit", (code, signal) => {
      const reason = signal ? `signal ${signal}` : `code ${code}`;
      console.log(`[Flask] Exited (${reason})`);
      this.process = null;
      this.ready = false;
    });

    // Wait for Flask to respond to health check
    await this.waitForHealthy();
    this.ready = true;
    console.log(`[Flask] Ready on http://localhost:${this.port}`);

    return this.port;
  }

  /** Stop the Flask backend gracefully. */
  async stop(): Promise<void> {
    if (!this.process || this.process.exitCode !== null) {
      return;
    }

    return new Promise<void>((resolve) => {
      const pid = this.process!.pid!;

      const forceKillTimeout = setTimeout(() => {
        console.log("[Flask] Graceful shutdown timed out, forcing kill");
        kill(pid, "SIGKILL");
      }, SHUTDOWN_TIMEOUT_MS);

      this.process!.on("exit", () => {
        clearTimeout(forceKillTimeout);
        this.process = null;
        this.ready = false;
        resolve();
      });

      console.log("[Flask] Sending SIGTERM...");
      kill(pid, "SIGTERM");
    });
  }

  /** Whether Flask is currently running and healthy. */
  isReady(): boolean {
    return this.ready && this.process !== null;
  }

  /** Get the port Flask is running on. */
  getPort(): number {
    return this.port;
  }

  /** Poll the health endpoint until it responds or timeout. */
  private waitForHealthy(): Promise<void> {
    const startTime = Date.now();

    return new Promise<void>((resolve, reject) => {
      const attempt = (): void => {
        const elapsed = Date.now() - startTime;
        if (elapsed > STARTUP_TIMEOUT_MS) {
          return reject(
            new Error(
              `Flask did not become healthy within ${STARTUP_TIMEOUT_MS / 1000}s`
            )
          );
        }

        // If the process died before we got a health check, bail out
        if (this.process && this.process.exitCode !== null) {
          return reject(new Error("Flask process exited before becoming healthy"));
        }

        const req = http.get(
          `http://localhost:${this.port}${HEALTH_ENDPOINT}`,
          (res) => {
            // Any 2xx response means we're good
            res.resume(); // drain response body
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              return resolve();
            }
            // Non-2xx — retry
            setTimeout(attempt, 500);
          }
        );

        req.on("error", () => {
          // Connection refused — Flask isn't up yet, retry
          setTimeout(attempt, 500);
        });

        req.setTimeout(2000, () => {
          req.destroy();
          setTimeout(attempt, 500);
        });
      };

      attempt();
    });
  }
}
