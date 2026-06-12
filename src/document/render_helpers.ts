import type { StyleProperties, IDocument } from "./types";
import type { ShapeStyle } from "./theme";
import { Vector } from "../lib/vector";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  STANDARD_FONTS,
} from "./constants";
import { pdf_rgb, Style } from "./style";
import { instance_font, weight_value } from "./instancer";
import { get_variant_font } from "./markdown";

function ensure_base(pdoc: any, owner: IDocument, family: string): string {
  if (STANDARD_FONTS.includes(family)) return family;
  const info = owner.fonts.get(family);
  if (!info) return DEFAULT_FONT_FAMILY;
  if (!info.registered) {
    try {
      pdoc.registerFont(family, info.path);
      info.registered = true;
    } catch {
      return DEFAULT_FONT_FAMILY;
    }
  }
  return family;
}

export function weighted_font(
  pdoc: any,
  owner: IDocument,
  base: string,
  weight: number,
): string {
  if (STANDARD_FONTS.includes(base)) return base;
  const info = owner.fonts.get(base);
  if (!info || info.variable === false) return base;

  const key = `${base}@${weight}`;
  if (!pdoc._registeredFonts?.[key]) {
    const buf = instance_font(info.path, weight);
    if (!buf) return base;
    try {
      pdoc.registerFont(key, buf);
    } catch {
      return base;
    }
  }
  return key;
}

export function seg_variant(
  pdoc: any,
  owner: IDocument,
  family: string,
  base_weight: number | null,
  bold: boolean,
  italic: boolean,
): string {
  const standard = get_variant_font(family, bold, italic);
  if (standard !== family) return standard;
  if (bold) {
    const target = base_weight != null && base_weight >= 700 ? 900 : 700;
    return weighted_font(pdoc, owner, family, target);
  }
  if (base_weight != null) return weighted_font(pdoc, owner, family, base_weight);
  return family;
}

export function resolve_font(
  pdoc: any,
  style: StyleProperties,
  owner: IDocument,
): string {
  const base = ensure_base(
    pdoc,
    owner,
    style.font_family ?? DEFAULT_FONT_FAMILY,
  );
  const weight = weight_value(style.font_weight);
  if (weight == null) return base;
  return weighted_font(pdoc, owner, base, weight);
}

export function apply_font(
  pdoc: any,
  style: StyleProperties,
  owner: IDocument,
): void {
  const font_size = style.font_size ?? DEFAULT_FONT_SIZE;

  pdoc.font(resolve_font(pdoc, style, owner));
  pdoc.fontSize(font_size);

  if (!style.color) {
    pdoc.fillColor("black");
    return;
  }
  try {
    pdoc.fillColor(pdf_rgb(style.color));
  } catch {
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
    pdoc.fillColor(pdf_rgb(rect_style.fill_color), rect_style.opacity ?? 1);
  }
  if (rect_style?.stroke_color) {
    pdoc.strokeColor(pdf_rgb(rect_style.stroke_color));
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
