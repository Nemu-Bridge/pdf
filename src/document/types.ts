export type PageSize = "A4" | "Letter" | "Legal" | "Custom";

export interface PageDimensions {
  width: number;
  height: number;
}

export interface DocumentOptions {
  page_size?: PageSize;
  custom_dimensions?: PageDimensions;
  margin?: number | MarginValues;
}

export interface MarginValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ColorValue {
  r: number;
  g: number;
  b: number;
}

export interface StyleProperties {
  margin?: number | string;
  margin_top?: number | string;
  margin_right?: number | string;
  margin_bottom?: number | string;
  margin_left?: number | string;
  padding?: number | string;
  padding_top?: number | string;
  padding_right?: number | string;
  padding_bottom?: number | string;
  padding_left?: number | string;
  border?: string;
  border_top?: string;
  border_right?: string;
  border_bottom?: string;
  border_left?: string;
  background_color?: string;
  font_family?: string;
  font_size?: number;
  font_weight?: "normal" | "bold" | number;
  font_style?: "normal" | "italic" | "oblique";
  color?: string;
  text_align?: "left" | "center" | "right" | "justify";
  text_transform?: "none" | "capitalize" | "uppercase" | "lowercase";
  text_decoration?: "none" | "underline" | "line-through" | "overline";
  line_height?: number;
  letter_spacing?: number;
  line_style?: "solid" | "dashed" | "dotted" | "double";
  width?: number | string;
  height?: number | string;
  display?: "block" | "inline" | "none";
  position?: "static" | "relative" | "absolute";
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  opacity?: number;
  z_index?: number;
  transform?: string;
  transition?: string;
  animation?: string;
  cursor?: string;
  overflow?: "visible" | "hidden" | "scroll" | "auto";
  white_space?: "normal" | "nowrap" | "pre" | "pre-wrap" | "pre-line";
  word_break?: "normal" | "break-all" | "keep-all";
  word_wrap?: "normal" | "break-word";
  text_overflow?: "clip" | "ellipsis";
  vertical_align?: "baseline" | "top" | "middle" | "bottom" | "sub" | "super" | string;
  visibility?: "visible" | "hidden" | "collapse";
}

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FontDefinition {
  name: string;
  family: string;
  data: Buffer;
  subtype: "Type1" | "TrueType";
}

export interface ImageDefinition {
  name: string;
  width: number;
  height: number;
  data: Buffer;
  format: "png" | "jpeg";
}

export interface PdfObject {
  id: number;
  generation: number;
  content: string;
}

export interface PdfStream {
  length: number;
  content: string;
  filters?: string[];
}

export abstract class Element {
  style: StyleProperties;
  bounds: ElementBounds;

  constructor(style: StyleProperties = {}) {
    this.style = style;
    this.bounds = { x: 0, y: 0, width: 0, height: 0 };
  }

  abstract render(context: RenderContext): string;
  abstract calculate_layout(
    available_width: number,
    available_height: number
  ): ElementBounds;
}

export interface RenderContext {
  page_width: number;
  page_height: number;
  margin_top: number;
  margin_right: number;
  margin_bottom: number;
  margin_left: number;
  fonts: Map<string, FontDefinition>;
  images: Map<string, ImageDefinition>;
  current_y: number;
  page_number: number;
}
