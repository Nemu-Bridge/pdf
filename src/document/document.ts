import type {
  PageDimensions,
  DocumentOptions,
  MarginValues,
  StyleProperties,
} from "./types";
import {
  PAGE_DIMENSIONS,
  DEFAULT_MARGIN,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_FAMILY,
  STANDARD_FONTS,
} from "./constants";
import { normalize_margin, parse_color } from "./style";

import type { Theme, ShapeStyle } from "./theme";
import { Vector, type VectorLike } from "../lib/vector";

interface FontInfo {
  name: string;
  path: string;
  registered: boolean;
}

interface ImageInfo {
  name: string;
  path: string;
  width: number;
  height: number;
}

export interface TextMeasurement {
  width: number;
  height: number;
}

function apply_font(pdoc: any, style: StyleProperties, owner: Document): void {
  let font_family = style.font_family ?? DEFAULT_FONT_FAMILY;
  const font_size = style.font_size ?? DEFAULT_FONT_SIZE;

  if (!STANDARD_FONTS.includes(font_family)) {
    const custom_font = owner.get_font(font_family);
    if (custom_font && !custom_font.registered) {
      try {
        pdoc.registerFont(font_family, custom_font.path);
        custom_font.registered = true;
      } catch {
        console.warn(`Could not load font ${font_family}, using default`);
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

function exec_rect(
  pdoc: any,
  pos: Vector,
  size: Vector,
  rect_style?: ShapeStyle
): void {
  const xval = pos.x;
  const yval = pos.y;
  const width = size.x;
  const rect_h = size.y;

  if (rect_style?.fill_color) {
    const color = parse_color(rect_style.fill_color);
    pdoc.fillColor(
      [color.r * 255, color.g * 255, color.b * 255],
      rect_style.opacity ?? 1
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

export class Document {
  pages: Page[];
  page_width: number;
  page_height: number;
  margin: MarginValues;
  fonts: Map<string, FontInfo>;
  images: Map<string, ImageInfo>;
  pdf_doc: any;
  default_theme: Theme | null;

  constructor(options: DocumentOptions = {}) {
    this.pages = [];
    this.margin = normalize_margin(options.margin ?? DEFAULT_MARGIN);
    this.fonts = new Map();
    this.images = new Map();
    this.pdf_doc = null;
    this.default_theme = null;

    const dimensions = this.get_page_dimensions(options);
    this.page_width = dimensions.width;
    this.page_height = dimensions.height;
  }

  get_page_dimensions(options?: DocumentOptions): PageDimensions {
    if (options?.custom_dimensions) {
      return options.custom_dimensions;
    }
    const size: keyof typeof PAGE_DIMENSIONS = (options?.page_size ??
      "A4") as keyof typeof PAGE_DIMENSIONS;
    return (PAGE_DIMENSIONS[size] ?? PAGE_DIMENSIONS.A4) as PageDimensions;
  }

  set_theme(theme: Theme): void {
    this.default_theme = theme;
  }

  create_page(theme?: Theme): Page {
    const page = new Page(this, theme ?? this.default_theme ?? undefined);
    this.pages.push(page);
    return page;
  }

  add_page(): Page {
    return this.create_page();
  }

  async load_font(name: string, file_path: string): Promise<void> {
    this.fonts.set(name, { name, path: file_path, registered: false });
  }

  load_font_sync(name: string, file_path: string): void {
    this.fonts.set(name, { name, path: file_path, registered: false });
  }

  async load_image(name: string, file_path: string): Promise<void> {
    this.images.set(name, { name, path: file_path, width: 0, height: 0 });
  }

  load_image_sync(name: string, file_path: string): void {
    this.images.set(name, { name, path: file_path, width: 0, height: 0 });
  }

  get_font(name: string): FontInfo | undefined {
    return this.fonts.get(name);
  }

  get_image(name: string): ImageInfo | undefined {
    return this.images.get(name);
  }

  set_pdf_doc(pdoc: any): void {
    this.pdf_doc = pdoc;
  }

  get_pdf_doc(): any {
    if (!this.pdf_doc) {
      throw new Error("PDF document not initialized");
    }
    return this.pdf_doc;
  }

  async build(file_path: string): Promise<void> {
    const pdfkit = await import("pdfkit");
    const PDFDocument = (pdfkit as any).default || pdfkit;
    const fs = await import("fs");

    const pdoc = new PDFDocument({
      size: [this.page_width, this.page_height],
      margin: this.margin.left,
    });

    this.set_pdf_doc(pdoc);

    const stream = fs.createWriteStream(file_path);
    pdoc.pipe(stream);

    const first_page = this.pages[0];
    if (first_page) {
      first_page.render(pdoc);
      for (let i = 1; i < this.pages.length; i++) {
        const next_page = this.pages[i];
        if (next_page) {
          pdoc.addPage();
          next_page.render(pdoc);
        }
      }
    }

    pdoc.end();

    return new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });
  }
}

export class Container {
  private owner: Document;
  private theme: Theme | null;
  private ops: Array<(pdoc: any, base_pos: Vector) => void>;

  constructor(owner: Document, theme: Theme | null) {
    this.owner = owner;
    this.theme = theme;
    this.ops = [];
  }

  rect(pos: Vector, size: Vector, style?: ShapeStyle): void {
    this.ops.push((pdoc, base_pos) => {
      const final_pos = pos.add(base_pos);
      exec_rect(pdoc, final_pos, size, style);
    });
  }

  text(options: {
    content: string;
    style?: StyleProperties;
    classname?: string;
    position?: Vector;
    width?: number;
  }): void {
    this.ops.push((pdoc, base_pos) => {
      let style = options.style ?? {};
      if (options.classname && this.theme) {
        style = this.theme.merge_classname(style, options.classname!);
      }
      const final_style = this.theme?.apply_to_style(style, "text") ?? style;
      apply_font(pdoc, final_style, this.owner);

      const avail_width =
        options.width ??
        pdoc.page.width - pdoc.page.margins.left - pdoc.page.margins.right;
      const line_gap = final_style.line_height
        ? (final_style.line_height - 1) *
          (final_style.font_size ?? DEFAULT_FONT_SIZE)
        : 2;
      const text_opts: any = {
        align: final_style.text_align ?? "left",
        lineGap: line_gap,
        width: avail_width,
      };

      if (options.position) {
        const final_pos = options.position.add(base_pos);
        pdoc.text(options.content, final_pos.x, final_pos.y, text_opts);
      } else {
        pdoc.text(options.content, text_opts);
      }
    });
  }

  header(options: {
    text: string;
    style?: StyleProperties;
    classname?: string;
    position?: Vector;
    width?: number;
  }): void {
    this.ops.push((pdoc, base_pos) => {
      let style = options.style ?? {};
      if (options.classname && this.theme) {
        style = this.theme.merge_classname(style, options.classname!);
      }
      const final_style =
        this.theme?.apply_to_style({ ...style }, "heading") ?? style;
      apply_font(pdoc, final_style, this.owner);

      const avail_width =
        options.width ??
        pdoc.page.width - pdoc.page.margins.left - pdoc.page.margins.right;
      const text_opts: any = {
        align: final_style.text_align ?? "left",
        width: avail_width,
      };

      if (options.position) {
        const final_pos = options.position.add(base_pos);
        pdoc.text(options.text, final_pos.x, final_pos.y, text_opts);
      } else {
        pdoc.text(options.text, text_opts);
      }
    });
  }

  move_down(amount: number = 1): void {
    this.ops.push((pdoc, _base_pos) => {
      pdoc.moveDown(amount);
    });
  }

  render(pdoc: any, position: Vector): void {
    for (const oper of this.ops) oper(pdoc, position);
  }
}

export class Page {
  private owner: Document;
  private operations: Array<(pdoc: any) => void>;
  private theme: Theme | null;
  private cursor: Vector;

  constructor(owner: Document, theme?: Theme) {
    this.owner = owner;
    this.operations = [];
    this.theme = theme ?? null;
    this.cursor = new Vector(owner.margin.left, owner.margin.top);
  }

  get_width(): number {
    return this.owner.page_width;
  }
  get_height(): number {
    return this.owner.page_height;
  }
  get_content_width(): number {
    return (
      this.owner.page_width - this.owner.margin.left - this.owner.margin.right
    );
  }
  get_content_height(): number {
    return (
      this.owner.page_height - this.owner.margin.top - this.owner.margin.bottom
    );
  }
  get_margin_left(): number {
    return this.owner.margin.left;
  }
  get_margin_right(): number {
    return this.owner.margin.right;
  }
  get_margin_top(): number {
    return this.owner.margin.top;
  }
  get_margin_bottom(): number {
    return this.owner.margin.bottom;
  }

  get_cursor(): Vector {
    return this.cursor.copy();
  }
  set_cursor(pos: VectorLike): void {
    this.cursor = new Vector(pos);
  }
  get_cursor_x(): number {
    return this.cursor.x;
  }
  get_cursor_y(): number {
    return this.cursor.y;
  }

  measure_text(content: string, style?: StyleProperties): TextMeasurement {
    const font_size = style?.font_size ?? DEFAULT_FONT_SIZE;
    const line_height = style?.line_height ?? 1.2;
    const avg_char_width = font_size * 0.5;
    const estimated_width = content.length * avg_char_width;
    const num_lines =
      Math.ceil(estimated_width / this.get_content_width()) || 1;
    return {
      width: Math.min(estimated_width, this.get_content_width()),
      height: num_lines * font_size * line_height,
    };
  }

  container(position?: Vector): Container {
    const container = new Container(this.owner, this.theme);
    const pos = position ?? this.get_cursor();
    this.operations.push((pdoc: any) => container.render(pdoc, pos));
    return container;
  }

  text(options: {
    content: string;
    style?: StyleProperties;
    classname?: string;
    position?: Vector;
    width?: number;
  }): void {
    this.operations.push((pdoc: any) => {
      let style = options.style ?? {};
      if (options.classname && this.theme) {
        style = this.theme.merge_classname(style, options.classname!);
      }
      const final_style = this.theme?.apply_to_style(style, "text") ?? style;
      apply_font(pdoc, final_style, this.owner);

      const avail_width =
        options.width ??
        pdoc.page.width - pdoc.page.margins.left - pdoc.page.margins.right;
      const line_gap = final_style.line_height
        ? (final_style.line_height - 1) *
          (final_style.font_size ?? DEFAULT_FONT_SIZE)
        : 2;
      const text_opts: any = {
        align: final_style.text_align ?? "left",
        lineGap: line_gap,
        width: avail_width,
      };

      if (options.position) {
        pdoc.text(options.content, options.position.x, options.position.y, text_opts);
      } else {
        pdoc.text(options.content, text_opts);
      }
    });
  }

  header(options: {
    text: string;
    style?: StyleProperties;
    classname?: string;
    position?: Vector;
    width?: number;
  }): void {
    this.operations.push((pdoc: any) => {
      let style = options.style ?? {};
      if (options.classname && this.theme) {
        style = this.theme.merge_classname(style, options.classname!);
      }
      const final_style =
        this.theme?.apply_to_style({ ...style }, "heading") ?? style;
      apply_font(pdoc, final_style, this.owner);

      const avail_width =
        options.width ??
        pdoc.page.width - pdoc.page.margins.left - pdoc.page.margins.right;
      const text_opts: any = {
        align: final_style.text_align ?? "left",
        width: avail_width,
      };

      if (options.position) {
        pdoc.text(options.text, options.position.x, options.position.y, text_opts);
      } else {
        pdoc.text(options.text, text_opts);
      }
    });
  }

  move_down(amount: number = 1): void {
    this.operations.push((pdoc: any) => {
      pdoc.moveDown(amount);
    });
  }

  rect(pos: Vector, size: Vector, style?: ShapeStyle): void {
    this.operations.push((pdoc: any) => {
      exec_rect(pdoc, pos, size, style);
    });
  }

  image(options: {
    name: string;
    position?: Vector;
    width?: number;
    height?: number;
  }): void {
    this.operations.push((pdoc: any) => {
      const image = this.owner.get_image(options.name);
      if (!image) {
        console.warn(`Image ${options.name} not found`);
        return;
      }
      try {
        const pos = options.position ?? new Vector(pdoc.x, pdoc.y);
        pdoc.image(image.path, pos.x, pos.y, {
          width: options.width ?? 200,
          height: options.height,
        });
      } catch (error) {
        console.warn(`Failed to render image: ${error}`);
      }
    });
  }

  push_op(callback: (pdoc: any) => void): void {
    this.operations.push(callback);
  }

  render(pdoc: any): void {
    for (const operation of this.operations) {
      operation(pdoc);
    }
  }
}

export { Theme, create_theme } from "./theme";
export { Vector, vector, type VectorLike } from "../lib/vector";
