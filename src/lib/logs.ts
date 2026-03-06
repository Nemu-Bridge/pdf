import * as fs from "fs";
import { promises as fsp } from "fs";
import * as path from "path";
import { colors, colorize } from "./colors";

const LOG_DIR =
  process.env.LOG_DIR ?? path.join(process.cwd(), "storage", "logs");

const MAX_QUEUE = 10_000;

type EventData = {
  line: string;
  message: string;
  stack?: string;
};

let current_date = "";
let stream: fs.WriteStream | null = null;
let init = false;

const queue: EventData[] = [];
let flushing = false;

function utc_date(): string {
  return new Date().toISOString().slice(0, 10);
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function log_path(date: string): string {
  return path.join(LOG_DIR, `${date}.log`);
}

function console_colored(type: "log" | "error", message: string): void {
  const date = colorize(timestamp(), colors.dim);

  if (type === "error") {
    const tag = colorize("ERROR", colors.red);
    console.error(`${date} ${tag} ${message}`);
  } else {
    const tag = colorize("INFO", colors.green);
    console.log(`${date} ${tag} ${message}`);
  }
}

async function setup(): Promise<void> {
  const date = utc_date();
  if (stream && current_date === date) return;
  if (init) return;

  init = true;

  try {
    await fsp.mkdir(LOG_DIR, { recursive: true });
    stream?.end();
    stream = fs.createWriteStream(log_path(date), { flags: "a" });
    current_date = date;
  } catch (err) {
    console.error("Logger init failed:", err);
  } finally {
    init = false;
  }
}

async function flush(): Promise<void> {
  if (flushing) return;
  flushing = true;

  try {
    await setup();
    if (!stream) return;

    while (queue.length > 0) {
      const event = queue.shift()!;

      if (!stream.write(event.line)) {
        await new Promise<void>((res) => stream!.once("drain", res));
      }
    }
  } finally {
    flushing = false;
  }
}

export function log(message: string, stack?: string): void {
  console_colored("log", message);
  if (queue.length >= MAX_QUEUE) return;

  const line =
    `[${timestamp()}]` + (stack ? ` [${stack}]` : "") + ` ${String(message)}\n`;

  queue.push({ line, message: String(message), stack });
  void flush();
}

export function log_error(error: unknown): void {
  const normalized = normalize(error);
  console_colored("error", normalized.message);

  if (normalized.stack) {
    console_colored("error", normalized.stack);
  }

  log(normalized.message, normalized.stack);
}

export function normalize(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: "Unknown error" };
  }
}

export async function shutdown(): Promise<void> {
  try {
    await flush();
    stream?.end();
  } catch {}
}
