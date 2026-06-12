import { BaseElement } from "../document/elements";
import type { StyleProperties, MeasuredSize } from "../document/types";
import { apply_font, compute_padding } from "../document/render_helpers";
import { color_css } from "../document/style";
import { latex_to_svg, default_formula_font } from "./mathjax";
import SVGtoPDF from "svg-to-pdfkit";

const ex_factor = 0.5;

export class FormulaElement extends BaseElement {
  private latex: string;
  private style: StyleProperties;
  private box_width: number;
  private prepared: boolean;
  private svg: string;
  private svg_width: number;
  private svg_height: number;

  constructor(latex: string, style: StyleProperties) {
    super("flow");
    this.latex = latex;
    this.style = style;
    this.box_width = 0;
    this.prepared = false;
    this.svg = "";
    this.svg_width = 0;
    this.svg_height = 0;
  }

  private prepare(): void {
    if (this.prepared) return;
    this.prepared = true;
    const font_size = this.style.font_size ?? 13;
    const rendered = latex_to_svg(
      this.latex,
      true,
      this.style.font ?? default_formula_font,
    );
    if (!rendered.svg) return;
    const factor = font_size * ex_factor;
    this.svg_width = rendered.w_ex * factor;
    this.svg_height = rendered.h_ex * factor;
    const css_color = color_css(this.style.color);
    this.svg = css_color
      ? rendered.svg.replace("<svg", `<svg color="${css_color}"`)
      : rendered.svg;
  }

  measure(avail_width: number): MeasuredSize {
    this.prepare();
    const padding = compute_padding(this.style);
    const font_size = this.style.font_size ?? 13;
    const content_height = this.svg ? this.svg_height : font_size * 1.4;
    this.box_width = avail_width;
    this.measured_size = {
      width: avail_width,
      height: content_height + padding.top + padding.bottom + 4,
    };
    return this.measured_size;
  }

  render(pdoc: any): void {
    const pos = this.computed_position!;
    const padding = compute_padding(this.style);
    const inner = this.box_width - padding.left - padding.right;

    if (!this.svg) {
      apply_font(pdoc, this.style, this._document!);
      pdoc.text(this.latex, pos.x + padding.left, pos.y + padding.top, {
        width: inner,
        align: "center",
      });
      return;
    }

    const x = pos.x + padding.left + Math.max(0, (inner - this.svg_width) / 2);
    const y = pos.y + padding.top + 2;
    SVGtoPDF(pdoc, this.svg, x, y, {
      width: this.svg_width,
      height: this.svg_height,
      assumePt: true,
    });
  }
}
