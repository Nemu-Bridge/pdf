import { pathToFileURL } from "node:url";
import { mathjax } from "@mathjax/src/js/mathjax.js";
import "@mathjax/src/js/util/asyncLoad/node.js";
import { TeX } from "@mathjax/src/js/input/tex.js";
import { SVG } from "@mathjax/src/js/output/svg.js";
import { liteAdaptor } from "@mathjax/src/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "@mathjax/src/js/handlers/html.js";
import "@mathjax/src/js/input/tex/ams/AmsConfiguration.js";
import "@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js";
import "@mathjax/src/js/input/tex/configmacros/ConfigMacrosConfiguration.js";
import { MathJaxTermesFont } from "@mathjax/mathjax-termes-font/js/svg.js";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex_packages = ["base", "ams", "newcommand", "configmacros"];

const make_document = (font: unknown): unknown => {
  const document = mathjax.document("", {
    InputJax: new TeX({ packages: tex_packages }),
    OutputJax: new SVG({ fontCache: "none", fontData: font }),
  });
  const dynamic_font = font as { loadDynamicFilesSync?: () => void };
  if (typeof dynamic_font.loadDynamicFilesSync === "function") {
    try {
      dynamic_font.loadDynamicFilesSync();
    } catch {
      void 0;
    }
  }
  return document;
};

const font_packages: Record<string, string> = {
  termes: "@mathjax/mathjax-termes-font/js/svg.js",
  newcm: "@mathjax/mathjax-newcm-font/js/svg.js",
  modern: "@mathjax/mathjax-modern-font/js/svg.js",
  pagella: "@mathjax/mathjax-pagella-font/js/svg.js",
  stix2: "@mathjax/mathjax-stix2-font/js/svg.js",
  fira: "@mathjax/mathjax-fira-font/js/svg.js",
};

export const default_formula_font = "termes";
export const available_formula_fonts = Object.keys(font_packages);

const documents = new Map<string, unknown>();
documents.set(default_formula_font, make_document(new MathJaxTermesFont()));

const warmup = (name: string): void => {
  const doc = documents.get(name) as { convert: (s: string, o: object) => unknown };
  try {
    doc.convert("\\binom{1}{2} + \\sqrt{x} \\int", { display: true });
  } catch {
    return;
  }
};
warmup(default_formula_font);

const find_font_class = (
  mod: Record<string, unknown>,
): (new () => unknown) | null => {
  const candidates = [
    ...Object.values(mod),
    ...(mod.default && typeof mod.default === "object"
      ? Object.values(mod.default)
      : []),
  ];
  return (
    candidates.find(
      (value): value is new () => unknown =>
        typeof value === "function" && /Font$/.test(value.name),
    ) ?? null
  );
};

const try_document = async (
  load: () => Promise<Record<string, unknown>>,
): Promise<unknown> => {
  try {
    const font_class = find_font_class(await load());
    return font_class ? make_document(new font_class()) : null;
  } catch {
    return null;
  }
};

export const load_formula_font = async (name: string): Promise<boolean> => {
  if (documents.has(name)) return true;
  const pkg = font_packages[name];
  if (!pkg) return false;
  const doc =
    (await try_document(() => import(pkg))) ??
    (await try_document(() =>
      import(pathToFileURL(require.resolve(pkg)).href),
    ));
  if (!doc) return false;
  documents.set(name, doc);
  warmup(name);
  return true;
};

export interface MathSvg {
  svg: string;
  w_ex: number;
  h_ex: number;
}

export const latex_to_svg = (
  latex: string,
  display: boolean,
  font: string,
): MathSvg => {
  const doc = (documents.get(font) ?? documents.get(default_formula_font)) as {
    convert: (s: string, o: object) => unknown;
  };
  try {
    const node = doc.convert(latex, { display });
    const html = adaptor.outerHTML(node as never);
    const svg = html.slice(html.indexOf("<svg"), html.indexOf("</svg>") + 6);
    const w = svg.match(/width="([\d.]+)ex"/);
    const h = svg.match(/height="([\d.]+)ex"/);
    return {
      svg,
      w_ex: w?.[1] ? Number(w[1]) : 0,
      h_ex: h?.[1] ? Number(h[1]) : 0,
    };
  } catch {
    return { svg: "", w_ex: 0, h_ex: 0 };
  }
};
