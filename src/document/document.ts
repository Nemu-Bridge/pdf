import type {
  PageDimensions,
  DocumentOptions,
  MarginValues,
  StyleProperties,
  IDocument,
} from "./types";
import { PAGE_DIMENSIONS, DEFAULT_MARGIN } from "./constants";
import { normalize_margin } from "./style";
import { bundled_fonts } from "./fonts";
import type { Theme } from "./theme";
import { LayoutEngine } from "./layout";
import {
  HeaderContainer,
  FooterContainer,
  make_text,
  make_rect,
  make_image,
  make_table,
  make_container,
  resolve_element_style,
  type BaseElement,
  type TextElement,
  type RectElement,
  type ImageElement,
  type ContainerElement,
  type TableElement,
  type CreateContainerOptions,
  type CreateTextOptions,
  type CreateRectOptions,
  type CreateImageOptions,
  type CreateTableOptions,
} from "./elements";

interface FontInfo {
  name: string;
  path: string;
  registered: boolean;
  variable?: boolean;
}

interface ImageInfo {
  name: string;
  path: string;
  width: number;
  height: number;
}

export class Document implements IDocument {
  pages: Page[];
  page_width: number;
  page_height: number;
  margin: MarginValues;
  fonts: Map<string, FontInfo>;
  images: Map<string, ImageInfo>;
  pdf_doc: any;
  default_theme: Theme | null;
  parse_markdown: boolean;

  constructor(options: DocumentOptions = {}) {
    this.pages = [];
    this.margin = normalize_margin(options.margin ?? DEFAULT_MARGIN);
    this.fonts = new Map();
    Object.entries(bundled_fonts).forEach(([name, path]) =>
      this.fonts.set(name, { name, path, registered: false, variable: true }),
    );
    this.images = new Map();
    this.pdf_doc = null;
    this.default_theme = null;
    this.parse_markdown = options.parse_markdown ?? false;
    const dimensions = this.get_page_dimensions(options);
    this.page_width = dimensions.width;
    this.page_height = dimensions.height;
  }

  get_page_dimensions(options?: DocumentOptions): PageDimensions {
    if (options?.custom_dimensions) return options.custom_dimensions;
    const size = (options?.page_size ?? "A4") as keyof typeof PAGE_DIMENSIONS;
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

  load_font_sync(name: string, file_path: string, variable = false): void {
    this.fonts.set(name, { name, path: file_path, registered: false, variable });
  }

  async load_font(
    name: string,
    file_path: string,
    variable = false,
  ): Promise<void> {
    this.load_font_sync(name, file_path, variable);
  }

  load_image_sync(name: string, file_path: string): void {
    this.images.set(name, { name, path: file_path, width: 0, height: 0 });
  }

  async load_image(name: string, file_path: string): Promise<void> {
    this.load_image_sync(name, file_path);
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
    if (!this.pdf_doc) throw new Error("PDF document not initialized");
    return this.pdf_doc;
  }

  private register_all_fonts(pdoc: any): void {
    this.fonts.forEach((info) => {
      if (!info.registered) {
        try {
          pdoc.registerFont(info.name, info.path);
          info.registered = true;
        } catch {
          console.warn(`Could not register font ${info.name}`);
        }
      }
    });
  }

  async prepare_pdf(): Promise<any> {
    const pdfkit = await import("pdfkit");
    const PDFDocument = (pdfkit as any).default || pdfkit;
    const pdoc = new PDFDocument({
      size: [this.page_width, this.page_height],
      autoFirstPage: false,
    });
    this.set_pdf_doc(pdoc);
    this.register_all_fonts(pdoc);
    return pdoc;
  }

  async render_to(file_path: string): Promise<void> {
    const fs = await import("fs");
    const pdoc = this.get_pdf_doc();

    const stream = fs.createWriteStream(file_path);
    pdoc.pipe(stream);

    const engine = new LayoutEngine(this, pdoc);
    for (const page of this.pages) {
      pdoc.addPage({ size: [this.page_width, this.page_height], margin: 0 });
      engine.run(page);
      if (page.on_render) page.on_render(pdoc);
    }

    pdoc.end();

    return new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });
  }

  async build(file_path: string): Promise<void> {
    await this.prepare_pdf();
    return this.render_to(file_path);
  }
}

export class Page {
  header: HeaderContainer | null;
  footer: FooterContainer | null;
  root_elements: BaseElement[];
  on_render: ((pdoc: any) => void) | null;
  private owner: Document;
  private theme: Theme | null;

  constructor(owner: Document, theme?: Theme) {
    this.owner = owner;
    this.theme = theme ?? null;
    this.header = null;
    this.footer = null;
    this.root_elements = [];
    this.on_render = null;
  }

  header_container(options?: CreateContainerOptions): HeaderContainer {
    if (!this.header) {
      const resolved = this.resolve_style(
        options?.style,
        options?.classname,
        "container",
      );
      this.header = new HeaderContainer(options ?? {}, resolved);
    }
    return this.header;
  }

  footer_container(options?: CreateContainerOptions): FooterContainer {
    if (!this.footer) {
      const resolved = this.resolve_style(
        options?.style,
        options?.classname,
        "container",
      );
      this.footer = new FooterContainer(options ?? {}, resolved);
    }
    return this.footer;
  }

  text(options: CreateTextOptions): TextElement {
    return make_text(options, this.theme, this.owner.parse_markdown);
  }

  rect(options: CreateRectOptions): RectElement {
    return make_rect(options, this.theme, this.owner.parse_markdown);
  }

  image(options: CreateImageOptions): ImageElement {
    return make_image(options, this.theme, this.owner.parse_markdown);
  }

  table(options: CreateTableOptions): TableElement {
    return make_table(options, this.theme, this.owner.parse_markdown);
  }

  create_container(options?: CreateContainerOptions): ContainerElement {
    return make_container(options, this.theme, this.owner.parse_markdown);
  }

  add(...elements: BaseElement[]): this {
    for (const el of elements) this.root_elements.push(el);
    return this;
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

  private resolve_style(
    style: StyleProperties | undefined,
    classname: string | undefined,
    element_type: "heading" | "text" | "container",
  ): StyleProperties {
    return resolve_element_style(style, classname, element_type, this.theme);
  }
}

export { Theme, create_theme } from "./theme";
export { Vector, vector, type VectorLike } from "../lib/vector";
