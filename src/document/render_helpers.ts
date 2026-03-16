import type { StyleProperties, IDocument } from "./types";
import type { ShapeStyle } from "./theme";
import { Vector } from "../lib/vector";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  STANDARD_FONTS,
} from "./constants";
import { parse_color, Style } from "./style";

export function apply_font(
  pdoc: any,
  style: StyleProperties,
  owner: IDocument,
): void {
  let font_family = style.font_family ?? DEFAULT_FONT_FAMILY;
  const font_size = style.font_size ?? DEFAULT_FONT_SIZE;

  if (!STANDARD_FONTS.includes(font_family)) {
    const custom_font = owner.fonts.get(font_family);
    if (custom_font && !custom_font.registered) {
      try {
        pdoc.registerFont(font_family, custom_font.path);
        custom_font.registered = true;
      } catch {
        font_family = DEFAULT_FONT_FAMILY;
      }
    } else if (!custom_font) {
      font_family = DEFAULT_FONT_FAMILY;
    }
  }

  pdoc.font(font_family);
  pdoc.fontSize(font_size);

  if (style.color) {
    try {
      const color = parse_color(style.color);
      pdoc.fillColor([color.r * 255, color.g * 255, color.b * 255]);
    } catch {
      pdoc.fillColor("black");
    }
  } else {
    pdoc.fillColor("black");
  }
}

export function resolve_font_family(
  style: StyleProperties,
  owner: IDocument,
): string {
  let font_family = style.font_family ?? DEFAULT_FONT_FAMILY;
  if (!STANDARD_FONTS.includes(font_family)) {
    const custom_font = owner.fonts.get(font_family);
    if (!custom_font) font_family = DEFAULT_FONT_FAMILY;
  }
  return font_family;
}

export function exec_rect(
  pdoc: any,
  pos: Vector,
  size: Vector,
  rect_style?: ShapeStyle,
): void {
  const xval = pos.x;
  const yval = pos.y;
  const width = size.x;
  const rect_h = size.y;

  if (rect_style?.fill_color) {
    const color = parse_color(rect_style.fill_color);
    pdoc.fillColor(
      [color.r * 255, color.g * 255, color.b * 255],
      rect_style.opacity ?? 1,
    );
  }
  if (rect_style?.stroke_color) {
    const color = parse_color(rect_style.stroke_color);
    pdoc.strokeColor([color.r * 255, color.g * 255, color.b * 255]);
  }
  if (rect_style?.stroke_width) pdoc.lineWidth(rect_style.stroke_width);
  if (rect_style?.border_radius) {
    pdoc.roundedRect(xval, yval, width, rect_h, rect_style.border_radius);
  } else {
    pdoc.rect(xval, yval, width, rect_h);
  }
  if (rect_style?.fill_color) pdoc.fill();
  if (rect_style?.stroke_color) pdoc.stroke();
}

export function compute_padding(style: StyleProperties): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  return new Style(style).get_padding();
}
