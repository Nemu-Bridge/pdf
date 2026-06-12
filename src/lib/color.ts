export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type ColorInput =
  | { hex: string }
  | { rgb: [number, number, number] }
  | { rgba: [number, number, number, number] }
  | { hsl: [number, number, number] }
  | { hsla: [number, number, number, number] };

export interface ColorValue {
  rgba: Rgba;
  to_hex(): string;
  to_hexa(): string;
  to_rgb(): string;
  to_rgba(): string;
  to_hsl(): string;
  to_hsla(): string;
  to_object(): Rgba;
  alpha(value: number): ColorValue;
  lighten(amount: number): ColorValue;
  darken(amount: number): ColorValue;
  mix(other: ColorValue | ColorInput, ratio: number): ColorValue;
  luminance(): number;
  is_dark(): boolean;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const byte = (value: number): string =>
  clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");

const parse_hex = (hex: string): Rgba => {
  const raw = hex.replace(/^#/, "");
  const full =
    raw.length === 3 || raw.length === 4
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
    a: full.length >= 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1,
  };
};

const hue_channels = (
  c: number,
  x: number,
  hue: number,
): [number, number, number] => {
  if (hue < 60) return [c, x, 0];
  if (hue < 120) return [x, c, 0];
  if (hue < 180) return [0, c, x];
  if (hue < 240) return [0, x, c];
  if (hue < 300) return [x, 0, c];
  return [c, 0, x];
};

const hsl_to_rgba = (
  hue: number,
  saturation: number,
  lightness: number,
  alpha: number,
): Rgba => {
  const s = clamp(saturation, 0, 100) / 100;
  const l = clamp(lightness, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const h = ((hue % 360) + 360) % 360;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const [r1, g1, b1] = hue_channels(c, x, h);
  const m = l - c / 2;
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
    a: alpha,
  };
};

const rgb_to_hsl = (rgba: Rgba): { h: number; s: number; l: number } => {
  const r = rgba.r / 255;
  const g = rgba.g / 255;
  const b = rgba.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;
  if (delta === 0) return { h: 0, s: 0, l: l * 100 };
  const s = delta / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? ((g - b) / delta) % 6
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4;
  return {
    h: ((h * 60) % 360 + 360) % 360,
    s: s * 100,
    l: l * 100,
  };
};

const parse_input = (input: ColorInput): Rgba => {
  if ("hex" in input) return parse_hex(input.hex);
  if ("rgb" in input) {
    return { r: input.rgb[0], g: input.rgb[1], b: input.rgb[2], a: 1 };
  }
  if ("rgba" in input) {
    return {
      r: input.rgba[0],
      g: input.rgba[1],
      b: input.rgba[2],
      a: input.rgba[3],
    };
  }
  if ("hsl" in input) {
    return hsl_to_rgba(input.hsl[0], input.hsl[1], input.hsl[2], 1);
  }
  return hsl_to_rgba(input.hsla[0], input.hsla[1], input.hsla[2], input.hsla[3]);
};

const to_rgba = (input: ColorValue | ColorInput): Rgba =>
  "rgba" in input && typeof input.rgba === "object"
    ? (input as ColorValue).rgba
    : parse_input(input as ColorInput);

const from_rgba = (rgba: Rgba): ColorValue => {
  const round = (value: number): number => Math.round(value);
  return {
    rgba,
    to_hex: () => `#${byte(rgba.r)}${byte(rgba.g)}${byte(rgba.b)}`,
    to_hexa: () =>
      `#${byte(rgba.r)}${byte(rgba.g)}${byte(rgba.b)}${byte(rgba.a * 255)}`,
    to_rgb: () => `rgb(${round(rgba.r)}, ${round(rgba.g)}, ${round(rgba.b)})`,
    to_rgba: () =>
      `rgba(${round(rgba.r)}, ${round(rgba.g)}, ${round(rgba.b)}, ${rgba.a})`,
    to_hsl: () => {
      const hsl = rgb_to_hsl(rgba);
      return `hsl(${round(hsl.h)}, ${round(hsl.s)}%, ${round(hsl.l)}%)`;
    },
    to_hsla: () => {
      const hsl = rgb_to_hsl(rgba);
      return `hsla(${round(hsl.h)}, ${round(hsl.s)}%, ${round(hsl.l)}%, ${rgba.a})`;
    },
    to_object: () => ({ ...rgba }),
    alpha: (value) => from_rgba({ ...rgba, a: clamp(value, 0, 1) }),
    lighten: (amount) => {
      const hsl = rgb_to_hsl(rgba);
      return from_rgba(
        hsl_to_rgba(hsl.h, hsl.s, hsl.l + amount * 100, rgba.a),
      );
    },
    darken: (amount) => {
      const hsl = rgb_to_hsl(rgba);
      return from_rgba(
        hsl_to_rgba(hsl.h, hsl.s, hsl.l - amount * 100, rgba.a),
      );
    },
    mix: (other, ratio) => {
      const target = to_rgba(other);
      const blend = (a: number, b: number): number => a + (b - a) * ratio;
      return from_rgba({
        r: blend(rgba.r, target.r),
        g: blend(rgba.g, target.g),
        b: blend(rgba.b, target.b),
        a: blend(rgba.a, target.a),
      });
    },
    luminance: () => {
      const channel = (value: number): number => {
        const v = value / 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return (
        0.2126 * channel(rgba.r) +
        0.7152 * channel(rgba.g) +
        0.0722 * channel(rgba.b)
      );
    },
    is_dark: () => from_rgba(rgba).luminance() < 0.5,
  };
};

function create(input: ColorInput): ColorValue {
  return from_rgba(parse_input(input));
}

export const Color = create as {
  (input: ColorInput): ColorValue;
  new (input: ColorInput): ColorValue;
};
