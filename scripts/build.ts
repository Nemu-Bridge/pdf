import { $ } from "bun";
import { performance } from "perf_hooks";

const clear_line = "\r\x1b[K";
const hide_cursor = "\x1b[?25l";
const show_cursor = "\x1b[?25h";

const colors = {
  cyan: (s: string): string => `\x1b[36m${s}\x1b[0m`,
  green: (s: string): string => `\x1b[32m${s}\x1b[0m`,
  red: (s: string): string => `\x1b[31m${s}\x1b[0m`,
  gray: (s: string): string => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string): string => `\x1b[1m${s}\x1b[0m`,
};

const symbols = {
  pointer: "›",
  check: "✓",
  cross: "✗",
  corner: "└─",
};

class Terminal {
  private start_time: number;
  private spinner_frames: string[] = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private current_frame: number = 0;
  private spinner_timer: ReturnType<typeof setInterval> | null = null;
  private step_start_time: number = 0;
  private initial_frame: string;

  constructor() {
    this.start_time = performance.now();
    this.initial_frame = this.spinner_frames[0] as string;
    process.stdout.write(hide_cursor);
  }

  private format_time(): string {
    return new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  private get_elapsed(): string {
    return ((performance.now() - this.start_time) / 1000).toFixed(2);
  }

  private get_step_elapsed(): string {
    return ((performance.now() - this.step_start_time) / 1000).toFixed(2);
  }

  header(): void {
    console.log(`${colors.gray(symbols.pointer)} build started at ${this.format_time()}\n`);
  }

  start_step(label: string): void {
    this.step_start_time = performance.now();
    this.current_frame = 0;
    process.stdout.write(`  ${colors.gray(symbols.corner)} ${colors.cyan(this.initial_frame)} ${label}...`);

    this.spinner_timer = setInterval(() => {
      this.current_frame = (this.current_frame + 1) % this.spinner_frames.length;
      const frame = this.spinner_frames[this.current_frame] as string;
      process.stdout.write(`${clear_line}  ${colors.gray(symbols.corner)} ${colors.cyan(frame)} ${label}...`);
    }, 80);
  }

  succeed_step(msg: string): void {
    if (this.spinner_timer) {
      clearInterval(this.spinner_timer);
      this.spinner_timer = null;
    }
    const time = colors.gray(`(${this.get_step_elapsed()}s)`);
    console.log(`${clear_line}  ${colors.gray(symbols.corner)} ${colors.green(symbols.check)} ${msg} ${time}`);
  }

  fail_step(msg: string): void {
    if (this.spinner_timer) {
      clearInterval(this.spinner_timer);
      this.spinner_timer = null;
    }
    console.log(`${clear_line}  ${colors.gray(symbols.corner)} ${colors.red(symbols.cross)} ${colors.red(msg)}`);
  }

  finish(success: boolean): void {
    process.stdout.write(show_cursor);
    console.log("");
    const status = success ? colors.green("success") : colors.red("failed");
    const time = colors.bold(`${this.get_elapsed()}s`);
    console.log(`  ${colors.gray("[")}${status}${colors.gray("]")} build completed in ${time}`);
    console.log("");
  }
}

const ui = new Terminal();

process.on("exit", () => process.stdout.write(show_cursor));
process.on("SIGINT", () => {
  process.stdout.write(show_cursor);
  process.exit(1);
});

async function main(): Promise<void> {
  ui.header();

  // Clean dist
  ui.start_step("cleaning dist");
  await $`rm -rf dist`.nothrow();
  ui.succeed_step("dist cleaned");

  // Type check
  ui.start_step("type-checking sources");
  const tsc_result = await $`tsc --noEmit`.nothrow();
  if (tsc_result.exitCode !== 0) {
    ui.fail_step("type check failed");
    console.error(tsc_result.stderr?.toString() ?? "");
    process.exit(1);
  }
  ui.succeed_step("types validated");

  ui.start_step("linting codebase");
  const lint_result = await $`eslint src/ --max-warnings=0`.nothrow();
  if (lint_result.exitCode !== 0) {
    ui.fail_step("linting failed");
    console.error(lint_result.stderr?.toString() ?? "");
    process.exit(1);
  }
  ui.succeed_step("linting passed");

  ui.start_step("building ESM module");
  const esm_result = await Bun.build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist",
    target: "bun",
    format: "esm",
    naming: "[name].mjs",
  });

  if (!esm_result.success) {
    ui.fail_step("ESM build failed");
    for (const log of esm_result.logs) {
      console.error(log.message);
    }
    process.exit(1);
  }
  ui.succeed_step("ESM build complete");

  ui.start_step("building CommonJS module");
  const cjs_result = await Bun.build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist",
    target: "bun",
    format: "cjs",
    naming: "[name].js",
  });

  if (!cjs_result.success) {
    ui.fail_step("CJS build failed");
    for (const log of cjs_result.logs) {
      console.error(log.message);
    }
    process.exit(1);
  }
  ui.succeed_step("CJS build complete");

  ui.start_step("generating types");
  const types_result = await $`tsc --declaration --emitDeclarationOnly --outDir dist src/index.ts`.nothrow();
  if (types_result.exitCode !== 0) {
    ui.fail_step("type generation failed");
    console.error(types_result.stderr?.toString() ?? "");
    process.exit(1);
  }
  ui.succeed_step("types generated");

  ui.finish(true);
}

main();
