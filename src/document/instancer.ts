import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const weight_names: Record<string, number> = {
  thin: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

export const weight_value = (
  weight: string | number | undefined,
): number | null => {
  if (weight == null) return null;
  if (typeof weight === "number") return weight;
  return weight_names[weight.toLowerCase()] ?? null;
};

const wasm_candidates = (): string[] => {
  const bases: string[] = [];
  try {
    bases.push(dirname(fileURLToPath(import.meta.url)));
  } catch {
    /* not esm */
  }
  for (const entry of ["index.cjs", "index.mjs"]) {
    try {
      bases.push(dirname(require.resolve("./" + entry)));
    } catch {
      /* not resolvable */
    }
  }
  try {
    bases.push(dirname(require.resolve("harfbuzzjs/dist/harfbuzz-subset.wasm")));
  } catch {
    /* dev fallback only */
  }
  return bases;
};

const resolve_wasm = (): string | null => {
  for (const base of wasm_candidates()) {
    const file = join(base, "harfbuzz-subset.wasm");
    if (existsSync(file)) return file;
  }
  return null;
};

interface HbExports {
  memory: WebAssembly.Memory;
  malloc(size: number): number;
  free(ptr: number): void;
  hb_blob_create(
    data: number,
    len: number,
    mode: number,
    user: number,
    destroy: number,
  ): number;
  hb_face_create(blob: number, index: number): number;
  hb_face_destroy(face: number): void;
  hb_face_reference_blob(face: number): number;
  hb_blob_get_length(blob: number): number;
  hb_blob_get_data(blob: number, len: number): number;
  hb_subset_input_create_or_fail(): number;
  hb_subset_input_destroy(input: number): void;
  hb_subset_input_keep_everything(input: number): void;
  hb_subset_input_pin_axis_location(
    input: number,
    face: number,
    axis: number,
    value: number,
  ): number;
  hb_subset_or_fail(face: number, input: number): number;
}

let hb: HbExports | null | undefined;

const load_hb = (): HbExports | null => {
  if (hb !== undefined) return hb;
  const path = resolve_wasm();
  if (!path) {
    hb = null;
    return hb;
  }
  try {
    const mod = new WebAssembly.Module(readFileSync(path));
    const inst = new WebAssembly.Instance(mod, {});
    hb = inst.exports as unknown as HbExports;
  } catch {
    hb = null;
  }
  return hb;
};

const axis_tag = (tag: string): number =>
  ((tag.charCodeAt(0) << 24) |
    (tag.charCodeAt(1) << 16) |
    (tag.charCodeAt(2) << 8) |
    tag.charCodeAt(3)) >>>
  0;

const cache = new Map<string, Buffer | null>();

export const instance_font = (
  file_path: string,
  weight: number,
): Buffer | null => {
  const key = `${file_path}@${weight}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const e = load_hb();
  if (!e) {
    cache.set(key, null);
    return null;
  }

  let out: Buffer | null = null;
  try {
    const src = readFileSync(file_path);
    const ptr = e.malloc(src.length);
    new Uint8Array(e.memory.buffer).set(src, ptr);
    const blob = e.hb_blob_create(ptr, src.length, 0, 0, 0);
    const face = e.hb_face_create(blob, 0);
    const input = e.hb_subset_input_create_or_fail();
    e.hb_subset_input_keep_everything(input);
    e.hb_subset_input_pin_axis_location(input, face, axis_tag("wght"), weight);
    const new_face = e.hb_subset_or_fail(face, input);
    if (new_face) {
      const out_blob = e.hb_face_reference_blob(new_face);
      const len = e.hb_blob_get_length(out_blob);
      const data = e.hb_blob_get_data(out_blob, 0);
      out = Buffer.from(new Uint8Array(e.memory.buffer).slice(data, data + len));
      e.hb_face_destroy(new_face);
    }
    e.hb_subset_input_destroy(input);
    e.hb_face_destroy(face);
    e.free(ptr);
  } catch {
    out = null;
  }

  cache.set(key, out);
  return out;
};
