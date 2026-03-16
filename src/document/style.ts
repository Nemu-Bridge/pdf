import type { ColorValue, MarginValues, StyleProperties } from "./types";

export const parse_color = (color_str: string): ColorValue => {
  const hex_match = color_str.match(/^#([0-9a-f]{6})$/i);
  if (hex_match && hex_match[1]) {
    const hex = hex_match[1];
    return {
      r: parseInt(hex.substring(0, 2), 16) / 255,
      g: parseInt(hex.substring(2, 4), 16) / 255,
      b: parseInt(hex.substring(4, 6), 16) / 255,
    };
  }

  const short_match = color_str.match(/^#([0-9a-f]{3})$/i);
  if (short_match && short_match[1]) {
    const hex = short_match[1];
    return {
      r: parseInt(hex[0]! + hex[0]!, 16) / 255,
      g: parseInt(hex[1]! + hex[1]!, 16) / 255,
      b: parseInt(hex[2]! + hex[2]!, 16) / 255,
    };
  }

  const rgb_match = color_str.match(
    /^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i,
  );
  if (rgb_match && rgb_match[1] && rgb_match[2] && rgb_match[3]) {
    return {
      r: parseInt(rgb_match[1], 10) / 255,
      g: parseInt(rgb_match[2], 10) / 255,
      b: parseInt(rgb_match[3], 10) / 255,
    };
  }

  throw new Error(`Invalid color format: ${color_str}`);
};

export const parse_dimension = (
  value: number | string | undefined,
  reference: number,
): number => {
  if (value === undefined) return 0;
  if (typeof value === "number") return value;

  const percent_match = value.match(/^(\d+\.?\d*)%$/);
  if (percent_match && percent_match[1]) {
    return (parseFloat(percent_match[1]) / 100) * reference;
  }

  const px_match = value.match(/^(\d+\.?\d*)px$/);
  if (px_match && px_match[1]) {
    return parseFloat(px_match[1]);
  }

  const pt_match = value.match(/^(\d+\.?\d*)pt$/);
  if (pt_match && pt_match[1]) {
    return parseFloat(pt_match[1]);
  }

  return parseFloat(value) || 0;
};

export const normalize_margin = (
  margin: number | Partial<MarginValues> | undefined,
): MarginValues => {
  if (margin === undefined) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  if (typeof margin === "number") {
    return { top: margin, right: margin, bottom: margin, left: margin };
  }

  const top = margin.top ?? 0;
  const right = margin.right ?? top;
  const bottom = margin.bottom ?? top;
  const left = margin.left ?? right;

  return { top, right, bottom, left };
};

export const expand_shorthand = (style: StyleProperties): StyleProperties => {
  const expanded: StyleProperties = { ...style };

  if (style.margin !== undefined) {
    const margin_val = style.margin;
    if (typeof margin_val === "number") {
      expanded.margin_top = margin_val;
      expanded.margin_right = margin_val;
      expanded.margin_bottom = margin_val;
      expanded.margin_left = margin_val;
    } else {
      const parts = margin_val.split(/\s+/).map((p) => parseFloat(p));
      if (parts.length === 1) {
        expanded.margin_top =
          expanded.margin_right =
          expanded.margin_bottom =
          expanded.margin_left =
            parts[0]!;
      } else if (parts.length === 2) {
        expanded.margin_top = expanded.margin_bottom = parts[0]!;
        expanded.margin_right = expanded.margin_left = parts[1]!;
      } else if (parts.length === 4) {
        expanded.margin_top = parts[0]!;
        expanded.margin_right = parts[1]!;
        expanded.margin_bottom = parts[2]!;
        expanded.margin_left = parts[3]!;
      }
    }
    delete expanded.margin;
  }

  if (style.padding !== undefined) {
    const padding_val = style.padding;
    if (typeof padding_val === "number") {
      expanded.padding_top = padding_val;
      expanded.padding_right = padding_val;
      expanded.padding_bottom = padding_val;
      expanded.padding_left = padding_val;
    } else {
      const parts = padding_val.split(/\s+/).map((p) => parseFloat(p));
      if (parts.length === 1) {
        expanded.padding_top =
          expanded.padding_right =
          expanded.padding_bottom =
          expanded.padding_left =
            parts[0]!;
      } else if (parts.length === 2) {
        expanded.padding_top = expanded.padding_bottom = parts[0]!;
        expanded.padding_right = expanded.padding_left = parts[1]!;
      } else if (parts.length === 4) {
        expanded.padding_top = parts[0]!;
        expanded.padding_right = parts[1]!;
        expanded.padding_bottom = parts[2]!;
        expanded.padding_left = parts[3]!;
      }
    }
    delete expanded.padding;
  }

  return expanded;
};

export const merge_styles = (
  base: StyleProperties,
  override: StyleProperties,
): StyleProperties => {
  return {
    ...base,
    ...override,
  };
};

export class Style {
  properties: StyleProperties;

  constructor(properties: StyleProperties = {}) {
    this.properties = expand_shorthand(properties);
  }

  get_margin(): { top: number; right: number; bottom: number; left: number } {
    const p = this.properties;
    return {
      top:
        typeof p.margin_top === "string"
          ? parseFloat(p.margin_top)
          : (p.margin_top ?? 0),
      right:
        typeof p.margin_right === "string"
          ? parseFloat(p.margin_right)
          : (p.margin_right ?? 0),
      bottom:
        typeof p.margin_bottom === "string"
          ? parseFloat(p.margin_bottom)
          : (p.margin_bottom ?? 0),
      left:
        typeof p.margin_left === "string"
          ? parseFloat(p.margin_left)
          : (p.margin_left ?? 0),
    };
  }

  get_padding(): { top: number; right: number; bottom: number; left: number } {
    const p = this.properties;
    return {
      top:
        typeof p.padding_top === "string"
          ? parseFloat(p.padding_top)
          : (p.padding_top ?? 0),
      right:
        typeof p.padding_right === "string"
          ? parseFloat(p.padding_right)
          : (p.padding_right ?? 0),
      bottom:
        typeof p.padding_bottom === "string"
          ? parseFloat(p.padding_bottom)
          : (p.padding_bottom ?? 0),
      left:
        typeof p.padding_left === "string"
          ? parseFloat(p.padding_left)
          : (p.padding_left ?? 0),
    };
  }

  get_color(): ColorValue | null {
    const color = this.properties.color;
    if (!color) return null;
    try {
      return parse_color(color);
    } catch {
      return null;
    }
  }

  get_background_color(): ColorValue | null {
    const color = this.properties.background_color;
    if (!color) return null;
    try {
      return parse_color(color);
    } catch {
      return null;
    }
  }

  get_dimension(property: "width" | "height", reference: number): number {
    const value = this.properties[property];
    return parse_dimension(value, reference);
  }
}
