export interface MarkdownSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  fraction?: { numerator: string; denominator: string };
}

const STANDARD_FONT_VARIANTS: Record<
  string,
  { bold: string; italic: string; bold_italic: string }
> = {
  Helvetica: {
    bold: "Helvetica-Bold",
    italic: "Helvetica-Oblique",
    bold_italic: "Helvetica-BoldOblique",
  },
  "Times-Roman": {
    bold: "Times-Bold",
    italic: "Times-Italic",
    bold_italic: "Times-BoldItalic",
  },
  Courier: {
    bold: "Courier-Bold",
    italic: "Courier-Oblique",
    bold_italic: "Courier-BoldOblique",
  },
};

export function get_variant_font(
  family: string,
  bold: boolean,
  italic: boolean,
): string {
  const variants = STANDARD_FONT_VARIANTS[family];
  if (!variants) return family;
  if (bold && italic) return variants.bold_italic;
  if (bold) return variants.bold;
  if (italic) return variants.italic;
  return family;
}

function parse_frac_at(
  s: string,
  start: number,
): { numerator: string; denominator: string; end: number } | null {
  if (!s.startsWith("\\frac", start)) return null;
  let i = start + 5;
  while (i < s.length && s[i] === " ") i++;
  if (s[i] !== "{") return null;

  // First brace group: numerator
  let depth = 0;
  let num_start = i + 1;
  let num_end = -1;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") depth++;
    else if (s[j] === "}") {
      depth--;
      if (depth === 0) {
        num_end = j;
        i = j + 1;
        break;
      }
    }
  }
  if (num_end < 0) return null;

  while (i < s.length && s[i] === " ") i++;
  if (s[i] !== "{") return null;

  // Second brace group: denominator
  depth = 0;
  let denom_start = i + 1;
  let denom_end = -1;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") depth++;
    else if (s[j] === "}") {
      depth--;
      if (depth === 0) {
        denom_end = j;
        i = j + 1;
        break;
      }
    }
  }
  if (denom_end < 0) return null;

  return {
    numerator: s.slice(num_start, num_end),
    denominator: s.slice(denom_start, denom_end),
    end: i,
  };
}

function latex_to_unicode(formula: string): string {
  let s = formula.trim();

  s = s.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");
  s = s.replace(/\\sqrt/g, "sqrt");
  s = s.replace(/\^\{([^}]+)\}/g, "^($1)");
  s = s.replace(/_\{([^}]+)\}/g, "_($1)");

  const symbols: Record<string, string> = {
    "\\alpha": "alpha",
    "\\beta": "beta",
    "\\gamma": "gamma",
    "\\delta": "delta",
    "\\epsilon": "epsilon",
    "\\varepsilon": "epsilon",
    "\\zeta": "zeta",
    "\\eta": "eta",
    "\\theta": "theta",
    "\\vartheta": "theta",
    "\\iota": "iota",
    "\\kappa": "kappa",
    "\\lambda": "lambda",
    "\\mu": "\u00b5",
    "\\nu": "nu",
    "\\xi": "xi",
    "\\pi": "pi",
    "\\varpi": "pi",
    "\\rho": "rho",
    "\\varrho": "rho",
    "\\sigma": "sigma",
    "\\varsigma": "sigma",
    "\\tau": "tau",
    "\\upsilon": "upsilon",
    "\\phi": "phi",
    "\\varphi": "phi",
    "\\chi": "chi",
    "\\psi": "psi",
    "\\omega": "omega",
    "\\Gamma": "Gamma",
    "\\Delta": "Delta",
    "\\Theta": "Theta",
    "\\Lambda": "Lambda",
    "\\Xi": "Xi",
    "\\Pi": "Pi",
    "\\Sigma": "Sigma",
    "\\Upsilon": "Upsilon",
    "\\Phi": "Phi",
    "\\Psi": "Psi",
    "\\Omega": "Omega",
    "\\sum": "sum",
    "\\prod": "prod",
    "\\int": "int",
    "\\iint": "iint",
    "\\iiint": "iiint",
    "\\oint": "oint",
    "\\partial": "d",
    "\\nabla": "nabla",
    "\\infty": "inf",
    "\\times": "\u00d7",
    "\\div": "\u00f7",
    "\\pm": "\u00b1",
    "\\mp": "-/+",
    "\\cdot": "\u00b7",
    "\\circ": "o",
    "\\bullet": "*",
    "\\oplus": "(+)",
    "\\otimes": "(*)",
    "\\cup": "union",
    "\\cap": "intersect",
    "\\subset": "subset",
    "\\supset": "supset",
    "\\subseteq": "subseteq",
    "\\supseteq": "supseteq",
    "\\in": "in",
    "\\notin": "not in",
    "\\exists": "exists",
    "\\nexists": "not exists",
    "\\forall": "forall",
    "\\neg": "\u00ac",
    "\\wedge": "and",
    "\\vee": "or",
    "\\leq": "<=",
    "\\geq": ">=",
    "\\neq": "!=",
    "\\approx": "~=",
    "\\equiv": "===",
    "\\sim": "~",
    "\\propto": "prop.to",
    "\\ll": "<<",
    "\\gg": ">>",
    "\\Leftrightarrow": "<=>",
    "\\Rightarrow": "=>",
    "\\Leftarrow": "<=",
    "\\leftrightarrow": "<->",
    "\\rightarrow": "->",
    "\\leftarrow": "<-",
    "\\uparrow": "^",
    "\\downarrow": "v",
    "\\to": "->",
    "\\gets": "<-",
    "\\langle": "<",
    "\\rangle": ">",
    "\\lfloor": "floor(",
    "\\rfloor": ")",
    "\\lceil": "ceil(",
    "\\rceil": ")",
    "\\ldots": "...",
    "\\cdots": "...",
    "\\vdots": "...",
    "\\ddots": "...",
    "\\{": "{",
    "\\}": "}",
    "\\,": " ",
    "\\;": " ",
    "\\:": " ",
    "\\!": "",
    "\\quad": "  ",
    "\\qquad": "    ",
  };

  const sorted_keys = Object.keys(symbols).sort((a, b) => b.length - a.length);
  for (const key of sorted_keys) {
    s = s.split(key).join(symbols[key]!);
  }

  const sup_map: Record<string, string> = {
    "1": "\u00b9",
    "2": "\u00b2",
    "3": "\u00b3",
  };

  s = s.replace(/\^([123])/g, (_, c: string) => sup_map[c] ?? `^${c}`);
  s = s.replace(/\^([a-zA-Z0-9])/g, "^$1");

  s = s.replace(/_([a-zA-Z0-9])/g, "_$1");

  s = s.replace(/\{([^}]+)\}/g, "$1");
  s = s.replace(/\\[a-zA-Z]+/g, "");
  s = s.replace(/\s+/g, " ").trim();

  return s;
}
function parse_latex_to_segments(
  formula: string,
  bold: boolean,
  italic: boolean,
  strikethrough: boolean,
): MarkdownSegment[] {
  const result: MarkdownSegment[] = [];
  let i = 0;
  let current = "";

  while (i < formula.length) {
    const frac = parse_frac_at(formula, i);
    if (frac) {
      if (current.trim()) {
        const t = latex_to_unicode(current);
        if (t) result.push({ text: t, bold, italic, strikethrough });
        current = "";
      }
      result.push({
        text: "",
        bold,
        italic,
        strikethrough,
        fraction: {
          numerator: latex_to_unicode(frac.numerator),
          denominator: latex_to_unicode(frac.denominator),
        },
      });
      i = frac.end;
    } else {
      current += formula[i];
      i++;
    }
  }

  if (current.trim()) {
    const t = latex_to_unicode(current);
    if (t) result.push({ text: t, bold, italic, strikethrough });
  }

  return result;
}

export function parse_inline_markdown(text: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  let i = 0;
  let current = "";
  let bold = false;
  let italic = false;
  let strikethrough = false;

  const flush = () => {
    if (current) {
      segments.push({ text: current, bold, italic, strikethrough });
      current = "";
    }
  };

  const push_latex = (formula: string) => {
    flush();
    const latex_segs = parse_latex_to_segments(
      formula,
      bold,
      true,
      strikethrough,
    );
    for (const seg of latex_segs) {
      if (seg.text || seg.fraction) segments.push(seg);
    }
  };

  while (i < text.length) {
    const ch = text[i]!;

    if (ch === "$") {
      if (text[i + 1] === "$") {
        flush();
        const end = text.indexOf("$$", i + 2);
        if (end >= 0) {
          push_latex(text.slice(i + 2, end));
          i = end + 2;
        } else {
          current += ch;
          i++;
        }
      } else {
        flush();
        const end = text.indexOf("$", i + 1);
        if (end >= 0) {
          push_latex(text.slice(i + 1, end));
          i = end + 1;
        } else {
          current += ch;
          i++;
        }
      }
    } else if (ch === "~" && text[i + 1] === "~") {
      flush();
      strikethrough = !strikethrough;
      i += 2;
    } else if (ch === "*" || ch === "_") {
      if (text[i + 1] === ch && text[i + 2] === ch) {
        flush();
        bold = !bold;
        italic = !italic;
        i += 3;
      } else if (text[i + 1] === ch) {
        flush();
        bold = !bold;
        i += 2;
      } else {
        flush();
        italic = !italic;
        i += 1;
      }
    } else {
      current += ch;
      i++;
    }
  }

  flush();
  return segments;
}

function render_fraction_stacked(
  pdoc: any,
  frac: { numerator: string; denominator: string },
  font: string,
  font_size: number,
  x: number,
  y: number,
): number {
  const sub_fs = Math.max(6, Math.round(font_size * 0.72));
  pdoc.font(font).fontSize(sub_fs);

  const num_w = pdoc.widthOfString(frac.numerator);
  const denom_w = pdoc.widthOfString(frac.denominator);
  const bar_w = Math.max(num_w, denom_w) + 6;

  const num_x = x + (bar_w - num_w) / 2;
  const denom_x = x + (bar_w - denom_w) / 2;

  const bar_y = y + sub_fs + 2;
  const denom_y = bar_y + 2;

  pdoc.text(frac.numerator, num_x, y, { lineBreak: false, continued: false });
  pdoc.rect(x, bar_y - 0.25, bar_w, 0.5).fill();
  pdoc.font(font).fontSize(sub_fs);
  pdoc.text(frac.denominator, denom_x, denom_y, {
    lineBreak: false,
    continued: false,
  });

  return bar_w + 4;
}

export function render_markdown_inline(
  pdoc: any,
  content: string,
  base_font: string,
  font_size: number,
  text_opts: Record<string, any>,
  position?: { x: number; y: number },
): void {
  const segments = parse_inline_markdown(content);

  if (segments.length === 0) return;

  const has_fractions = segments.some((s) => s.fraction);

  if (has_fractions) {
    const sx: number = position?.x ?? (pdoc.x as number);
    const sy: number = position?.y ?? (pdoc.y as number);
    let cx = sx;

    for (const seg of segments) {
      if (!seg.text && !seg.fraction) continue;
      const font = get_variant_font(base_font, seg.bold, seg.italic);

      if (seg.fraction) {
        pdoc.font(font).fontSize(font_size);
        cx += render_fraction_stacked(
          pdoc,
          seg.fraction,
          font,
          font_size,
          cx,
          sy,
        );
        pdoc.font(font).fontSize(font_size);
      } else {
        pdoc.font(font).fontSize(font_size);
        const w = pdoc.widthOfString(seg.text);
        pdoc.text(seg.text, cx, sy, {
          lineBreak: false,
          continued: false,
          strike: seg.strikethrough,
        });
        cx += w;
      }
    }

    const sub_fs = Math.round(font_size * 0.72);
    const line_h = sub_fs + 2 + 2 + sub_fs;
    pdoc.font(base_font).fontSize(font_size);
    pdoc.text("", sx, sy + line_h + 4, { lineBreak: false, continued: false });
    return;
  }

  const needs_formatting = segments.some(
    (s) => s.bold || s.italic || s.strikethrough,
  );

  if (!needs_formatting) {
    pdoc.font(base_font).fontSize(font_size);
    if (position) {
      pdoc.text(content, position.x, position.y, text_opts);
    } else {
      pdoc.text(content, text_opts);
    }
    return;
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg) continue;
    const is_last = i === segments.length - 1;
    const font = get_variant_font(base_font, seg.bold, seg.italic);

    pdoc.font(font).fontSize(font_size);

    const seg_opts: Record<string, any> = {
      continued: !is_last,
      width: text_opts.width,
      strike: seg.strikethrough,
    };

    if (i === 0) {
      seg_opts.align = text_opts.align ?? "left";
      if (text_opts.lineGap !== undefined) seg_opts.lineGap = text_opts.lineGap;
    }

    if (i === 0 && position) {
      pdoc.text(seg.text, position.x, position.y, seg_opts);
    } else {
      pdoc.text(seg.text, seg_opts);
    }
  }

  pdoc.font(base_font).fontSize(font_size);
}
