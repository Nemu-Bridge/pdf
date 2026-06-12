import type { StyleProperties } from "../document/types";
import { merge_styles } from "../document/style";
import type { RoleStyles, StyleRole } from "./types";

export const default_role_styles: Record<StyleRole, StyleProperties> = {
  heading: { color: "#000000", font_family: "inter" },
  paragraph: {
    color: "#1a1a1a",
    font_family: "source-serif-4",
    font_size: 12,
    line_height: 1.5,
  },
  code: {
    background_color: "#f2f2f2",
    color: "#000000",
    font_family: "geist-mono",
    font_size: 10,
    line_height: 1.45,
    padding: 12,
  },
  formula: { color: "#000000", font_size: 14 },
  list: {
    color: "#1a1a1a",
    font_family: "source-serif-4",
    font_size: 12,
    line_height: 1.5,
  },
  link: { color: "#000000" },
  group: {},
  divider: { background_color: "#d4d4d4" },
  note: {
    color: "#1a1a1a",
    font_family: "source-serif-4",
    font_size: 11,
    line_height: 1.5,
    padding: 12,
  },
  table: { color: "#1a1a1a", font_family: "source-serif-4", font_size: 10 },
  chart: { color: "#111827", font_family: "inter" },
};

export interface BlockMargin {
  top: number;
  bottom: number;
}

export const default_role_margins: Record<StyleRole, BlockMargin> = {
  heading: { top: 16, bottom: 6 },
  paragraph: { top: 0, bottom: 11 },
  code: { top: 2, bottom: 14 },
  formula: { top: 8, bottom: 16 },
  list: { top: 0, bottom: 11 },
  link: { top: 0, bottom: 0 },
  group: { top: 2, bottom: 14 },
  divider: { top: 6, bottom: 10 },
  note: { top: 4, bottom: 14 },
  table: { top: 4, bottom: 14 },
  chart: { top: 6, bottom: 16 },
};

export const heading_scale: Record<number, number> = {
  1: 26,
  2: 20,
  3: 16,
  4: 14,
  5: 12,
  6: 11,
};

export const resolve_style = (
  role: StyleRole,
  override: StyleProperties | undefined,
  set_styles: RoleStyles,
): StyleProperties =>
  merge_styles(
    merge_styles(default_role_styles[role], set_styles[role] ?? {}),
    override ?? {},
  );
