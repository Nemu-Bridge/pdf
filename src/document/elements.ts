import type {
  StyleProperties,
  BoundingBox,
  LayoutMode,
  MeasuredSize,
  ContainerLayout,
  FlexLayoutOptions,
  IDocument,
} from "./types";
import { Vector, type VectorLike } from "../lib/vector";
import type { ShapeStyle, Theme } from "./theme";
import { DEFAULT_FONT_SIZE, DEFAULT_FONT_FAMILY } from "./constants";
import {
  apply_font,
  resolve_font_family,
  exec_rect,
  compute_padding,
} from "./render_helpers";
import {
  parse_inline_markdown,
  render_markdown_inline,
  get_variant_font,
} from "./markdown";
import { parse_color } from "./style";

export interface CreateContainerOptions {
  layout?: ContainerLayout;
  style?: StyleProperties;
  classname?: string;
  width?: number;
  height?: number;
  position?: VectorLike;
  z_index?: number;
}

export interface CreateTextOptions {
  content: string;
  style?: StyleProperties;
  classname?: string;
  position?: VectorLike;
  width?: number;
  parse_markdown?: boolean;
  z_index?: number;
}

export interface CreateRectOptions {
  style?: StyleProperties;
  shape_style?: ShapeStyle;
  position?: VectorLike;
  width?: number;
  height?: number;
  z_index?: number;
}

export interface CreateImageOptions {
  name: string;
  position?: VectorLike;
  width?: number;
  height?: number;
  z_index?: number;
}

export interface TableCellInput {
  content: string;
  style?: StyleProperties;
}

export interface CreateTableOptions {
  columns: number | number[];
  style?: StyleProperties;
  position?: VectorLike;
  width?: number;
  border_color?: string;
  border_width?: number;
  cell_padding?: number;
  header_style?: StyleProperties;
  cell_style?: StyleProperties;
  z_index?: number;
}

export abstract class BaseElement {
  readonly id: symbol;
  readonly layout_mode: LayoutMode;
  measured_size: MeasuredSize | null;
  computed_position: Vector | null;
  computed_size: Vector | null;
  _document: IDocument | null;
  _theme: Theme | null;
  _doc_parse_markdown: boolean;
  protected _children: BaseElement[];
  z_index: number;

  constructor(layout_mode: LayoutMode) {
    this.id = Symbol();
    this.layout_mode = layout_mode;
    this.measured_size = null;
    this.computed_position = null;
    this.computed_size = null;
    this._document = null;
    this._theme = null;
    this._doc_parse_markdown = false;
    this._children = [];
    this.z_index = 0;
  }

  abstract measure(avail_width: number): MeasuredSize;
  layout_children(_origin: Vector, _avail_width: number): void {}
  abstract render(pdoc: any): void;

  get_position(): Vector {
    if (!this.computed_position) throw new Error("Element not yet built");
    return this.computed_position.copy();
  }

  get_size(): Vector {
    if (!this.computed_size) throw new Error("Element not yet built");
    return this.computed_size.copy();
  }

  get_bbox(): BoundingBox {
    const pos = this.get_position();
    const size = this.get_size();
    return { x: pos.x, y: pos.y, width: size.x, height: size.y };
  }

  protected _resolve_style(
    style: StyleProperties | undefined,
    classname: string | undefined,
    element_type: "heading" | "text" | "container",
  ): StyleProperties {
    let s = style ?? {};
    if (classname && this._theme) s = this._theme.merge_classname(s, classname);
    return this._theme?.apply_to_style(s, element_type) ?? s;
  }

  protected _measure_children(avail_width: number): void {
    for (const child of this._children) {
      child._document = this._document;
      child._theme = this._theme;
      child._doc_parse_markdown = this._doc_parse_markdown;
      child.measure(avail_width);
    }
  }

  protected _render_children(pdoc: any): void {
    if (this._children.length === 0) return;
    const parent_pos = this.computed_position!;
    const sorted = [...this._children].sort((a, b) => a.z_index - b.z_index);
    for (const child of sorted) {
      const child_opts_pos = (child as any).options?.position as
        | VectorLike
        | undefined;
      const px = child_opts_pos ? child_opts_pos.x : 0;
      const py = child_opts_pos ? child_opts_pos.y : 0;
      child.computed_position = new Vector(
        parent_pos.x + px,
        parent_pos.y + py,
      );
      child.computed_size = new Vector(
        child.measured_size!.width,
        child.measured_size!.height,
      );
      if (child instanceof ContainerElement) {
        child.layout_children(child.computed_position, child.computed_size.x);
      }
      child.render(pdoc);
    }
  }

  text(options: CreateTextOptions): TextElement {
    const resolved = this._resolve_style(
      options.style,
      options.classname,
      "text",
    );
    const el = new TextElement(options, resolved, this._doc_parse_markdown);
    el._theme = this._theme;
    el._doc_parse_markdown = this._doc_parse_markdown;
    this._children.push(el);
    return el;
  }

  rect(options: CreateRectOptions): RectElement {
    const resolved = this._resolve_style(options.style, undefined, "container");
    const el = new RectElement(options, resolved);
    el._theme = this._theme;
    el._doc_parse_markdown = this._doc_parse_markdown;
    this._children.push(el);
    return el;
  }

  image(options: CreateImageOptions): ImageElement {
    const el = new ImageElement(options);
    el._theme = this._theme;
    el._doc_parse_markdown = this._doc_parse_markdown;
    this._children.push(el);
    return el;
  }

  create_container(options?: CreateContainerOptions): ContainerElement {
    const resolved = this._resolve_style(
      options?.style,
      options?.classname,
      "container",
    );
    const el = new ContainerElement(options ?? {}, resolved);
    el._theme = this._theme;
    el._doc_parse_markdown = this._doc_parse_markdown;
    this._children.push(el);
    return el;
  }
}

export class TextElement extends BaseElement {
  readonly options: CreateTextOptions;
  private resolved_style: StyleProperties;
  private doc_parse_markdown: boolean;
  private _wrap_width: number = 0;

  constructor(
    options: CreateTextOptions,
    resolved_style: StyleProperties,
    doc_parse_markdown: boolean,
  ) {
    super(options.position ? "explicit" : "flow");
    this.options = options;
    this.resolved_style = resolved_style;
    this.doc_parse_markdown = doc_parse_markdown;
    this.z_index = options.z_index ?? 0;
  }

  measure(avail_width: number): MeasuredSize {
    const pdoc = this._document!.pdf_doc;
    const style = this.resolved_style;
    const font_family = resolve_font_family(style, this._document!);
    const font_size = style.font_size ?? DEFAULT_FONT_SIZE;
    const line_gap = style.line_height
      ? (style.line_height - 1) * font_size
      : 2;
    const wrap_width = this.options.width ?? avail_width;
    const use_md = this.options.parse_markdown ?? this.doc_parse_markdown;

    let measured_w: number;
    let measured_h: number;

    if (use_md) {
      const segments = parse_inline_markdown(this.options.content);
      let total_w = 0;
      for (const seg of segments) {
        const variant = get_variant_font(font_family, seg.bold, seg.italic);
        pdoc.font(variant).fontSize(font_size);
        total_w += pdoc.widthOfString(seg.text);
      }
      pdoc.font(font_family).fontSize(font_size);
      measured_w = Math.min(total_w, wrap_width);
      measured_h = pdoc.heightOfString(this.options.content, {
        width: wrap_width,
        lineGap: line_gap,
      });
    } else {
      pdoc.font(font_family).fontSize(font_size);
      measured_w = Math.min(
        pdoc.widthOfString(this.options.content),
        wrap_width,
      );
      measured_h = pdoc.heightOfString(this.options.content, {
        width: wrap_width,
        lineGap: line_gap,
      });
    }

    const padding = compute_padding(style);
    this._wrap_width = wrap_width;
    this.measured_size = {
      width: measured_w + padding.left + padding.right,
      height: measured_h + padding.top + padding.bottom,
    };
    this._measure_children(wrap_width);
    return this.measured_size;
  }

  render(pdoc: any): void {
    const pos = this.computed_position!;
    const style = this.resolved_style;
    const font_family = resolve_font_family(style, this._document!);
    const font_size = style.font_size ?? DEFAULT_FONT_SIZE;
    const use_md = this.options.parse_markdown ?? this.doc_parse_markdown;
    const padding = compute_padding(style);

    apply_font(pdoc, style, this._document!);

    const text_x = pos.x + padding.left;
    const text_y = pos.y + padding.top;
    const avail_width = this._wrap_width - padding.left - padding.right;
    const line_gap = style.line_height
      ? (style.line_height - 1) * font_size
      : 2;
    const text_opts: any = {
      align: style.text_align ?? "left",
      lineGap: line_gap,
      width: avail_width,
    };

    if (use_md) {
      render_markdown_inline(
        pdoc,
        this.options.content,
        font_family,
        font_size,
        text_opts,
        { x: text_x, y: text_y },
      );
    } else {
      pdoc.text(this.options.content, text_x, text_y, text_opts);
    }
    this._render_children(pdoc);
  }
}

export class RectElement extends BaseElement {
  readonly options: CreateRectOptions;

  constructor(options: CreateRectOptions, _resolved_style: StyleProperties) {
    super(options.position ? "explicit" : "flow");
    this.options = options;
    this.z_index = options.z_index ?? 0;
  }

  measure(avail_width: number): MeasuredSize {
    const w = this.options.width ?? avail_width;
    const h = this.options.height ?? 0;
    this.measured_size = { width: w, height: h };
    this._measure_children(w);
    return this.measured_size;
  }

  render(pdoc: any): void {
    exec_rect(
      pdoc,
      this.computed_position!,
      this.computed_size!,
      this.options.shape_style,
    );
    this._render_children(pdoc);
  }
}

export class ImageElement extends BaseElement {
  readonly options: CreateImageOptions;

  constructor(options: CreateImageOptions) {
    super(options.position ? "explicit" : "flow");
    this.options = options;
    this.z_index = options.z_index ?? 0;
  }

  measure(avail_width: number): MeasuredSize {
    const w = this.options.width ?? avail_width;
    const h = this.options.height ?? w;
    this.measured_size = { width: w, height: h };
    this._measure_children(w);
    return this.measured_size;
  }

  render(pdoc: any): void {
    const pos = this.computed_position!;
    const size = this.computed_size!;
    const image = this._document!.images.get(this.options.name);
    if (!image) {
      console.warn(`Image ${this.options.name} not found`);
      return;
    }
    try {
      pdoc.image(image.path, pos.x, pos.y, { width: size.x, height: size.y });
    } catch (err) {
      console.warn(`Failed to render image: ${err}`);
    }
    this._render_children(pdoc);
  }
}

export class ContainerElement extends BaseElement {
  protected children: BaseElement[];
  readonly options: CreateContainerOptions;
  readonly resolved_style: StyleProperties;
  protected padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  constructor(
    options: CreateContainerOptions,
    resolved_style: StyleProperties,
  ) {
    super(options.position ? "explicit" : "flow");
    this.options = options;
    this.resolved_style = resolved_style;
    this.children = [];
    this.padding = compute_padding(resolved_style);
    this.z_index = options.z_index ?? 0;
  }

  add(...elements: BaseElement[]): this {
    for (const el of elements) this.children.push(el);
    return this;
  }

  get_elements(): BaseElement[] {
    return [...this.children];
  }

  measure(avail_width: number): MeasuredSize {
    const outer_w = this.options.width ?? avail_width;
    const inner_w = Math.max(
      0,
      outer_w - this.padding.left - this.padding.right,
    );
    const layout = this.options.layout ?? { type: "flow" };
    const gap = (layout as any).gap ?? 0;

    const flow_children = this.children.filter((c) => c.layout_mode === "flow");
    const explicit_children = this.children.filter(
      (c) => c.layout_mode === "explicit",
    );

    for (const child of this.children) {
      child._document = this._document;
      child.measure(inner_w);
    }

    let content_h: number;

    if (
      layout.type === "flex" &&
      (layout as FlexLayoutOptions).direction === "row"
    ) {
      const row_h =
        flow_children.length > 0
          ? Math.max(...flow_children.map((c) => c.measured_size!.height))
          : 0;
      content_h = row_h;
    } else {
      const total_flow_h = flow_children.reduce(
        (sum, c) => sum + c.measured_size!.height,
        0,
      );
      const total_gaps =
        flow_children.length > 1 ? gap * (flow_children.length - 1) : 0;
      content_h = total_flow_h + total_gaps;
    }

    for (const child of explicit_children) {
      const child_pos = (child as any).options?.position as
        | VectorLike
        | undefined;
      if (child_pos) {
        const child_bottom = child_pos.y + child.measured_size!.height;
        if (child_bottom > content_h) content_h = child_bottom;
      }
    }

    const outer_h =
      this.options.height ?? content_h + this.padding.top + this.padding.bottom;

    this.measured_size = { width: outer_w, height: outer_h };
    this._measure_children(inner_w);
    return this.measured_size;
  }

  override layout_children(origin: Vector, avail_width: number): void {
    const inner_origin = new Vector(
      origin.x + this.padding.left,
      origin.y + this.padding.top,
    );
    const inner_w = Math.max(
      0,
      avail_width - this.padding.left - this.padding.right,
    );
    const layout = this.options.layout ?? { type: "flow" };

    if (layout.type === "flex") {
      const flex = layout as FlexLayoutOptions;
      if (flex.direction === "row") {
        this.layout_flex_row(inner_origin, inner_w, flex);
      } else {
        this.layout_flex_column(inner_origin, inner_w, flex);
      }
    } else {
      this.layout_flow(inner_origin, inner_w, (layout as any).gap ?? 0);
    }

    const explicit_children = this.children.filter(
      (c) => c.layout_mode === "explicit",
    );
    for (const child of explicit_children) {
      const child_pos = (child as any).options?.position as
        | VectorLike
        | undefined;
      const px = child_pos ? child_pos.x : 0;
      const py = child_pos ? child_pos.y : 0;
      child.computed_position = new Vector(
        inner_origin.x + px,
        inner_origin.y + py,
      );
      child.computed_size = new Vector(
        child.measured_size!.width,
        child.measured_size!.height,
      );
      if (child instanceof ContainerElement) {
        child.layout_children(child.computed_position, child.computed_size.x);
      }
    }
  }

  private layout_flow(origin: Vector, inner_w: number, gap: number): void {
    const flow_children = this.children.filter((c) => c.layout_mode === "flow");
    let cursor_y = origin.y;
    for (const child of flow_children) {
      child.computed_position = new Vector(origin.x, cursor_y);
      child.computed_size = new Vector(
        child.measured_size!.width,
        child.measured_size!.height,
      );
      cursor_y += child.measured_size!.height + gap;
      if (child instanceof ContainerElement) {
        child.layout_children(child.computed_position, inner_w);
      }
    }
  }

  private layout_flex_row(
    origin: Vector,
    inner_w: number,
    layout: FlexLayoutOptions,
  ): void {
    const gap = layout.gap ?? 0;
    const justify = layout.justify ?? "flex-start";
    const align = layout.align ?? "flex-start";

    const flow_children = this.children.filter((c) => c.layout_mode === "flow");
    if (flow_children.length === 0) return;

    const total_child_w = flow_children.reduce(
      (sum, c) => sum + c.measured_size!.width,
      0,
    );
    const total_gap_w = gap * Math.max(0, flow_children.length - 1);
    const free_space = inner_w - total_child_w - total_gap_w;
    const row_h = Math.max(
      ...flow_children.map((c) => c.measured_size!.height),
    );

    let cursor_x: number;
    let between_space = 0;

    switch (justify) {
      case "flex-end":
        cursor_x = origin.x + free_space;
        break;
      case "center":
        cursor_x = origin.x + free_space / 2;
        break;
      case "space-between":
        cursor_x = origin.x;
        between_space =
          flow_children.length > 1
            ? free_space / (flow_children.length - 1)
            : 0;
        break;
      case "space-around":
        between_space = free_space / flow_children.length;
        cursor_x = origin.x + between_space / 2;
        break;
      case "space-evenly":
        between_space = free_space / (flow_children.length + 1);
        cursor_x = origin.x + between_space;
        break;
      default:
        cursor_x = origin.x;
    }

    const uses_between =
      justify === "space-between" ||
      justify === "space-around" ||
      justify === "space-evenly";

    for (const child of flow_children) {
      let cross_offset = 0;
      switch (align) {
        case "center":
          cross_offset = (row_h - child.measured_size!.height) / 2;
          break;
        case "flex-end":
          cross_offset = row_h - child.measured_size!.height;
          break;
        case "stretch":
          child.measured_size = { ...child.measured_size!, height: row_h };
          break;
      }
      child.computed_position = new Vector(cursor_x, origin.y + cross_offset);
      child.computed_size = new Vector(
        child.measured_size!.width,
        child.measured_size!.height,
      );
      cursor_x +=
        child.measured_size!.width + (uses_between ? between_space : gap);
      if (child instanceof ContainerElement) {
        child.layout_children(child.computed_position, child.computed_size.x);
      }
    }
  }

  private layout_flex_column(
    origin: Vector,
    inner_w: number,
    layout: FlexLayoutOptions,
  ): void {
    const gap = layout.gap ?? 0;
    const justify = layout.justify ?? "flex-start";
    const align = layout.align ?? "flex-start";

    const flow_children = this.children.filter((c) => c.layout_mode === "flow");
    if (flow_children.length === 0) return;

    const total_child_h = flow_children.reduce(
      (sum, c) => sum + c.measured_size!.height,
      0,
    );
    const total_gap_h = gap * Math.max(0, flow_children.length - 1);
    const col_inner_h =
      (this.measured_size?.height ?? 0) -
      this.padding.top -
      this.padding.bottom;
    const free_space = col_inner_h - total_child_h - total_gap_h;

    let cursor_y: number;
    let between_space = 0;

    switch (justify) {
      case "flex-end":
        cursor_y = origin.y + free_space;
        break;
      case "center":
        cursor_y = origin.y + free_space / 2;
        break;
      case "space-between":
        cursor_y = origin.y;
        between_space =
          flow_children.length > 1
            ? free_space / (flow_children.length - 1)
            : 0;
        break;
      case "space-around":
        between_space = free_space / flow_children.length;
        cursor_y = origin.y + between_space / 2;
        break;
      case "space-evenly":
        between_space = free_space / (flow_children.length + 1);
        cursor_y = origin.y + between_space;
        break;
      default:
        cursor_y = origin.y;
    }

    const uses_between =
      justify === "space-between" ||
      justify === "space-around" ||
      justify === "space-evenly";

    for (const child of flow_children) {
      let cross_x = origin.x;
      switch (align) {
        case "center":
          cross_x = origin.x + (inner_w - child.measured_size!.width) / 2;
          break;
        case "flex-end":
          cross_x = origin.x + inner_w - child.measured_size!.width;
          break;
        case "stretch":
          child.measured_size = { ...child.measured_size!, width: inner_w };
          break;
      }
      child.computed_position = new Vector(cross_x, cursor_y);
      child.computed_size = new Vector(
        child.measured_size!.width,
        child.measured_size!.height,
      );
      cursor_y +=
        child.measured_size!.height + (uses_between ? between_space : gap);
      if (child instanceof ContainerElement) {
        child.layout_children(child.computed_position, inner_w);
      }
    }
  }

  render(pdoc: any): void {
    if (this.resolved_style.background_color) {
      try {
        const color = parse_color(this.resolved_style.background_color);
        pdoc
          .rect(
            this.computed_position!.x,
            this.computed_position!.y,
            this.computed_size!.x,
            this.computed_size!.y,
          )
          .fill([color.r * 255, color.g * 255, color.b * 255]);
      } catch {}
    }
    const sorted = [...this.children].sort((a, b) => a.z_index - b.z_index);
    for (const child of sorted) child.render(pdoc);
    this._render_children(pdoc);
  }
}

export class TableElement extends BaseElement {
  private rows: Array<Array<TableCellInput | string>>;
  private col_widths: number[];
  private row_heights: number[];
  readonly options: CreateTableOptions;
  private resolved_style: StyleProperties;

  constructor(options: CreateTableOptions, resolved_style: StyleProperties) {
    super(options.position ? "explicit" : "flow");
    this.options = options;
    this.resolved_style = resolved_style;
    this.rows = [];
    this.col_widths = [];
    this.row_heights = [];
    this.z_index = options.z_index ?? 0;
  }

  add_row(cells: Array<string | TableCellInput>): this {
    this.rows.push(cells);
    return this;
  }

  private resolve_column_widths(total_w: number): number[] {
    const cols = this.options.columns;
    if (typeof cols === "number") {
      const w = total_w / cols;
      return Array(cols).fill(w) as number[];
    }
    const auto_count = cols.filter((w) => w === 0).length;
    const total_fixed = cols.filter((w) => w > 0).reduce((s, w) => s + w, 0);
    const auto_w = auto_count > 0 ? (total_w - total_fixed) / auto_count : 0;
    return cols.map((w) => (w === 0 ? auto_w : w));
  }

  measure(avail_width: number): MeasuredSize {
    const pdoc = this._document!.pdf_doc;
    const total_w = this.options.width ?? avail_width;
    const padding = this.options.cell_padding ?? 8;
    this.col_widths = this.resolve_column_widths(total_w);
    this.row_heights = [];

    for (const row of this.rows) {
      let row_h = 0;
      for (let ci = 0; ci < row.length; ci++) {
        const cell = row[ci];
        if (!cell) continue;
        const col_w = this.col_widths[ci] ?? 0;
        const content = typeof cell === "string" ? cell : cell.content;
        const cell_style = typeof cell === "object" ? (cell.style ?? {}) : {};
        const font_size = cell_style.font_size ?? DEFAULT_FONT_SIZE;
        pdoc.font(DEFAULT_FONT_FAMILY).fontSize(font_size);
        const inner_w = Math.max(0, col_w - padding * 2);
        const text_h = pdoc.heightOfString(content, { width: inner_w });
        row_h = Math.max(row_h, text_h + padding * 2);
      }
      this.row_heights.push(row_h);
    }

    const total_h = this.row_heights.reduce((sum, h) => sum + h, 0);
    this.measured_size = { width: total_w, height: total_h };
    this._measure_children(total_w);
    return this.measured_size;
  }

  render(pdoc: any): void {
    const pos = this.computed_position!;
    const border_color = this.options.border_color ?? "#e2e8f0";
    const border_width = this.options.border_width ?? 1;
    const padding = this.options.cell_padding ?? 8;
    let row_y = pos.y;

    for (let ri = 0; ri < this.rows.length; ri++) {
      const row = this.rows[ri];
      if (!row) continue;
      const row_h = this.row_heights[ri] ?? 0;
      const is_header = ri === 0 && !!this.options.header_style;

      if (is_header && this.options.header_style?.background_color) {
        try {
          const color = parse_color(this.options.header_style.background_color);
          pdoc
            .rect(pos.x, row_y, this.computed_size!.x, row_h)
            .fill([color.r * 255, color.g * 255, color.b * 255]);
        } catch {}
      }

      let col_x = pos.x;
      for (let ci = 0; ci < this.col_widths.length; ci++) {
        const col_w = this.col_widths[ci] ?? 0;
        const cell = row[ci];
        const content = cell
          ? typeof cell === "string"
            ? cell
            : cell.content
          : "";
        const cell_style: StyleProperties =
          cell && typeof cell === "object" && cell.style
            ? cell.style
            : is_header
              ? (this.options.header_style ?? {})
              : (this.options.cell_style ?? {});

        if (border_width > 0) {
          try {
            const bc = parse_color(border_color);
            pdoc
              .lineWidth(border_width)
              .strokeColor([bc.r * 255, bc.g * 255, bc.b * 255])
              .rect(col_x, row_y, col_w, row_h)
              .stroke();
          } catch {}
        }

        const merged = { ...this.resolved_style, ...cell_style };
        apply_font(pdoc, merged, this._document!);
        const inner_w = Math.max(0, col_w - padding * 2);
        pdoc.text(content, col_x + padding, row_y + padding, {
          width: inner_w,
          align: cell_style.text_align ?? "left",
        });

        col_x += col_w;
      }

      row_y += row_h;
    }
    this._render_children(pdoc);
  }
}

export class HeaderContainer extends ContainerElement {
  zone_height: number;

  constructor(
    options: CreateContainerOptions,
    resolved_style: StyleProperties,
  ) {
    super(options, resolved_style);
    this.zone_height = 0;
  }

  override measure(avail_width: number): MeasuredSize {
    const result = super.measure(avail_width);
    this.zone_height = result.height;
    return result;
  }
}

export class FooterContainer extends ContainerElement {
  zone_height: number;

  constructor(
    options: CreateContainerOptions,
    resolved_style: StyleProperties,
  ) {
    super(options, resolved_style);
    this.zone_height = 0;
  }

  override measure(avail_width: number): MeasuredSize {
    const result = super.measure(avail_width);
    this.zone_height = result.height;
    return result;
  }
}
