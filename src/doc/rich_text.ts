import { BaseElement } from "../document/elements";
import type { StyleProperties, MeasuredSize } from "../document/types";
import { render_segments, type MarkdownSegment } from "../document/markdown";
import {
  apply_font,
  resolve_font_family,
  seg_variant,
  compute_padding,
} from "../document/render_helpers";
import { color_css, line_gap } from "../document/style";
import { weight_value } from "../document/instancer";
import { weighted_font } from "../document/render_helpers";
import { DEFAULT_FONT_SIZE } from "../document/constants";

export class RichTextElement extends BaseElement {
  private segments: MarkdownSegment[];
  private style: StyleProperties;
  private wrap_width: number;

  constructor(segments: MarkdownSegment[], style: StyleProperties) {
    super("flow");
    this.segments = segments;
    this.style = style;
    this.wrap_width = 0;
  }

  measure(avail_width: number): MeasuredSize {
    const pdoc = this._document!.pdf_doc;
    const font_family = resolve_font_family(this.style, this._document!);
    const font_size = this.style.font_size ?? DEFAULT_FONT_SIZE;
    const padding = compute_padding(this.style);
    const gap = line_gap(this.style, font_size);
    const inner = avail_width - padding.left - padding.right;
    const plain = this.segments.map((s) => s.text).join("");

    pdoc.font(font_family).fontSize(font_size);
    const height = pdoc.heightOfString(plain, {
      width: inner,
      lineGap: gap,
    });

    this.wrap_width = avail_width;
    this.measured_size = {
      width: avail_width,
      height: height + padding.top + padding.bottom,
    };
    return this.measured_size;
  }

  render(pdoc: any): void {
    const pos = this.computed_position!;
    const font_family = resolve_font_family(this.style, this._document!);
    const base_weight = weight_value(this.style.font_weight);
    const base_font =
      base_weight == null
        ? font_family
        : weighted_font(pdoc, this._document!, font_family, base_weight);
    const font_size = this.style.font_size ?? DEFAULT_FONT_SIZE;
    const padding = compute_padding(this.style);
    const gap = line_gap(this.style, font_size);
    const inner = this.wrap_width - padding.left - padding.right;

    apply_font(pdoc, this.style, this._document!);
    render_segments(
      pdoc,
      this.segments,
      base_font,
      font_size,
      {
        align: this.style.text_align ?? "left",
        lineGap: gap,
        width: inner,
      },
      { x: pos.x + padding.left, y: pos.y + padding.top },
      color_css(this.style.color),
      (_b, bo, it) =>
        seg_variant(pdoc, this._document!, font_family, base_weight, bo, it),
    );
  }
}
