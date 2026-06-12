import { BaseElement } from "../document/elements";
import type { StyleProperties, MeasuredSize } from "../document/types";
import {
  resolve_font_family,
  seg_variant,
  compute_padding,
} from "../document/render_helpers";
import { color_css, line_gap } from "../document/style";
import { weight_value } from "../document/instancer";
import { DEFAULT_FONT_SIZE } from "../document/constants";
import { to_segments, type SegmentOptions } from "./inline";
import { latex_to_svg, default_formula_font } from "./mathjax";
import SVGtoPDF from "svg-to-pdfkit";
import type { Inline } from "./types";

const ex_factor = 0.5;

interface TextToken {
  kind: "text";
  text: string;
  bold: boolean;
  italic: boolean;
  font?: string;
  color?: string;
  link?: string;
  underline?: boolean;
  strike?: boolean;
}
interface SpaceToken {
  kind: "space";
}
interface FormulaToken {
  kind: "formula";
  svg: string;
  width: number;
  height: number;
  ascent: number;
  depth: number;
}
type Token = TextToken | SpaceToken | FormulaToken;

interface Placed {
  token: Token;
  x: number;
  width: number;
  font?: string;
}
interface Line {
  items: Placed[];
  ascent: number;
  descent: number;
}

export class InlineFlowElement extends BaseElement {
  private nodes: Array<string | Inline>;
  private style: StyleProperties;
  private seg_opts: SegmentOptions;
  private formula_style: StyleProperties;
  private tokens: Token[];
  private prepared: boolean;
  private box_width: number;

  constructor(
    nodes: Array<string | Inline>,
    style: StyleProperties,
    seg_opts: SegmentOptions,
    formula_style: StyleProperties,
  ) {
    super("flow");
    this.nodes = nodes;
    this.style = style;
    this.seg_opts = seg_opts;
    this.formula_style = formula_style;
    this.tokens = [];
    this.prepared = false;
    this.box_width = 0;
  }

  private font_size(): number {
    return this.style.font_size ?? DEFAULT_FONT_SIZE;
  }

  private text_metrics(pdoc: any): { ascent: number; descent: number } {
    const family = resolve_font_family(this.style, this._document!);
    const size = this.font_size();
    pdoc.font(family).fontSize(size);
    const f = pdoc._font;
    const ascent =
      f && typeof f.ascender === "number"
        ? (f.ascender / 1000) * size
        : size * 0.8;
    const descent =
      f && typeof f.descender === "number"
        ? (Math.abs(f.descender) / 1000) * size
        : size * 0.2;
    return { ascent, descent };
  }

  private build_tokens(): void {
    if (this.prepared) return;
    this.prepared = true;

    const formula_font = this.formula_style.font ?? default_formula_font;
    const formula_color =
      color_css(this.formula_style.color) ?? color_css(this.style.color);
    const ex = this.font_size() * ex_factor;

    const push_text = (run: Array<string | Inline>): void => {
      if (run.length === 0) return;
      const segments = to_segments(run, this.seg_opts);
      for (const seg of segments) {
        const parts = seg.text.split(/(\s+)/);
        for (const part of parts) {
          if (part === "") continue;
          if (/^\s+$/.test(part)) {
            this.tokens.push({ kind: "space" });
          } else {
            this.tokens.push({
              kind: "text",
              text: part,
              bold: seg.bold,
              italic: seg.italic,
              font: seg.font,
              color: seg.color,
              link: seg.link,
              underline: seg.underline,
              strike: seg.strikethrough,
            });
          }
        }
      }
    };

    let run: Array<string | Inline> = [];
    for (const node of this.nodes) {
      if (typeof node === "object" && node.type === "formula") {
        push_text(run);
        run = [];
        const rendered = latex_to_svg(node.text, true, formula_font);
        if (!rendered.svg) {
          this.tokens.push({
            kind: "text",
            text: node.text,
            bold: false,
            italic: false,
          });
          continue;
        }
        const valign = rendered.svg.match(/vertical-align:\s*(-?[\d.]+)ex/);
        const depth = (valign ? Math.max(0, -Number(valign[1])) : 0) * ex;
        const width = rendered.w_ex * ex;
        const height = rendered.h_ex * ex;
        let svg = formula_color
          ? rendered.svg.replace("<svg", `<svg color="${formula_color}"`)
          : rendered.svg;
        svg = svg
          .replace(/width="[\d.]+ex"/, `width="${width}"`)
          .replace(/height="[\d.]+ex"/, `height="${height}"`);
        this.tokens.push({
          kind: "formula",
          svg,
          width,
          height,
          ascent: height - depth,
          depth,
        });
      } else {
        run.push(node);
      }
    }
    push_text(run);
  }

  private resolve_font(pdoc: any, token: TextToken): string {
    if (token.font) return token.font;
    const family = resolve_font_family(this.style, this._document!);
    const base_weight = weight_value(this.style.font_weight);
    return seg_variant(
      pdoc,
      this._document!,
      family,
      base_weight,
      token.bold,
      token.italic,
    );
  }

  private token_width(pdoc: any, token: Token, size: number): number {
    if (token.kind === "formula") return token.width;
    const font =
      token.kind === "text"
        ? this.resolve_font(pdoc, token)
        : resolve_font_family(this.style, this._document!);
    pdoc.font(font).fontSize(size);
    return pdoc.widthOfString(token.kind === "space" ? " " : token.text);
  }

  private layout(pdoc: any, max_width: number): Line[] {
    const size = this.font_size();
    const metrics = this.text_metrics(pdoc);
    const text_ascent = metrics.ascent;
    const text_descent = metrics.descent;
    const lines: Line[] = [];
    let items: Placed[] = [];
    let width = 0;
    let ascent = text_ascent;
    let descent = text_descent;

    const flush = (): void => {
      while (items.length && items[items.length - 1]!.token.kind === "space") {
        items.pop();
      }
      lines.push({ items, ascent, descent });
      items = [];
      width = 0;
      ascent = text_ascent;
      descent = text_descent;
    };

    for (const token of this.tokens) {
      const w = this.token_width(pdoc, token, size);
      if (token.kind === "space") {
        if (items.length === 0) continue;
        items.push({ token, x: width, width: w });
        width += w;
        continue;
      }
      if (width + w > max_width && items.length > 0) flush();
      const font =
        token.kind === "text" ? this.resolve_font(pdoc, token) : undefined;
      items.push({ token, x: width, width: w, font });
      width += w;
      if (token.kind === "formula") {
        if (token.ascent > ascent) ascent = token.ascent;
        if (token.depth > descent) descent = token.depth;
      }
    }
    if (items.length) flush();
    return lines;
  }

  measure(avail_width: number): MeasuredSize {
    this.build_tokens();
    const pdoc = this._document!.pdf_doc;
    const padding = compute_padding(this.style);
    const gap = line_gap(this.style, this.font_size());
    const inner = avail_width - padding.left - padding.right;
    this.box_width = avail_width;

    const lines = this.layout(pdoc, inner);
    let height = padding.top + padding.bottom;
    lines.forEach((line, i) => {
      height += line.ascent + line.descent;
      if (i < lines.length - 1) height += gap;
    });
    this.measured_size = { width: avail_width, height };
    return this.measured_size;
  }

  render(pdoc: any): void {
    const pos = this.computed_position!;
    const padding = compute_padding(this.style);
    const size = this.font_size();
    const gap = line_gap(this.style, size);
    const inner = this.box_width - padding.left - padding.right;
    const base_color = color_css(this.style.color);
    const metrics = this.text_metrics(pdoc);

    const lines = this.layout(pdoc, inner);
    let y = pos.y + padding.top;
    const x0 = pos.x + padding.left;

    for (const line of lines) {
      const baseline = y + line.ascent;
      for (const placed of line.items) {
        const token = placed.token;
        if (token.kind === "space") continue;
        if (token.kind === "formula") {
          SVGtoPDF(pdoc, token.svg, x0 + placed.x, baseline - token.ascent, {
            assumePt: true,
          });
          continue;
        }
        const font =
          placed.font ?? resolve_font_family(this.style, this._document!);
        pdoc.font(font).fontSize(size);
        if (token.color) pdoc.fillColor(token.color);
        else if (base_color) pdoc.fillColor(base_color);
        pdoc.text(token.text, x0 + placed.x, baseline - metrics.ascent, {
          lineBreak: false,
          width: placed.width,
          underline: !!token.underline,
          strike: !!token.strike,
          link: token.link ?? null,
        });
        if (base_color) pdoc.fillColor(base_color);
      }
      y += line.ascent + line.descent + gap;
    }
  }
}
