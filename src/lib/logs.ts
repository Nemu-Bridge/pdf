import { colors, colorize } from "./colors";

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
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

export function log(message: string): void {
  console_colored("log", message);
}

export function log_error(error: unknown): void {
  const normalized = normalize(error);
  console_colored("error", normalized.message);

  if (normalized.stack) {
    console_colored("error", normalized.stack);
  }
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
