import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const candidate_bases = (): string[] => {
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
  return bases;
};

const resolve_fonts_dir = (): string => {
  const bases = candidate_bases();
  const found = bases
    .map((base) => join(base, "fonts"))
    .find((dir) => existsSync(join(dir, "inter.ttf")));
  return found ?? join(bases[0] ?? ".", "fonts");
};

const dir = resolve_fonts_dir();

export const bundled_fonts: Record<string, string> = {
  inter: join(dir, "inter.ttf"),
  geist: join(dir, "geist.ttf"),
  "geist-mono": join(dir, "geist-mono.ttf"),
  "nunito-sans": join(dir, "nunito-sans.ttf"),
  roboto: join(dir, "roboto.ttf"),
  "source-serif-4": join(dir, "source-serif-4.ttf"),
};
