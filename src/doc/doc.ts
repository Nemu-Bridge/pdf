import { Document, Page } from "../document/document";
import type { BaseElement } from "../document/elements";
import type { MarginValues } from "../document/types";
import { normalize_margin } from "../document/style";
import { compile_block } from "./compile";
import { resolve_style } from "./styles";
import { load_formula_font, default_formula_font } from "./mathjax";
import type {
  Block,
  DocOptions,
  DrawArea,
  HeaderFooter,
  PageConfig,
  PageContext,
  RawDraw,
  RoleStyles,
} from "./types";

const to_block_array = (value: Block | Block[]): Block[] =>
  Array.isArray(value) ? value : [value];

const is_raw_draw = (hf: HeaderFooter): hf is RawDraw =>
  typeof hf === "object" &&
  hf !== null &&
  "draw" in hf &&
  typeof hf.draw === "function";

const resolve_hf = (
  hf: HeaderFooter | undefined,
  ctx: PageContext,
): Block[] => {
  if (hf === undefined || is_raw_draw(hf)) return [];
  if (typeof hf === "function") return to_block_array(hf(ctx));
  return to_block_array(hf);
};

const collect_formula_fonts = (
  blocks: Block[],
  styles: RoleStyles,
  out: Set<string>,
): void => {
  blocks.forEach((block) => {
    if (block.type === "formula") {
      out.add(
        resolve_style("formula", block.style, styles).font ??
          default_formula_font,
      );
      return;
    }
    if (block.type === "group") {
      collect_formula_fonts(block.children, styles, out);
    }
  });
};

const sum_margin = (
  margin: MarginValues,
  padding: MarginValues,
): MarginValues => ({
  top: margin.top + padding.top,
  right: margin.right + padding.right,
  bottom: margin.bottom + padding.bottom,
  left: margin.left + padding.left,
});

interface PhysicalPage {
  elements: BaseElement[];
  header: HeaderFooter | undefined;
  footer: HeaderFooter | undefined;
}

export class DocPage {
  private blocks: Block[];
  private header_hf: HeaderFooter | undefined;
  private footer_hf: HeaderFooter | undefined;

  constructor(config?: PageConfig) {
    this.blocks = [];
    this.header_hf = config?.header;
    this.footer_hf = config?.footer;
  }

  content(...items: Array<Block | Block[]>): this {
    this.blocks.push(...items.flat());
    return this;
  }

  get_blocks(): Block[] {
    return this.blocks;
  }

  get_header(): HeaderFooter | undefined {
    return this.header_hf;
  }

  get_footer(): HeaderFooter | undefined {
    return this.footer_hf;
  }
}

export class Doc {
  private options: DocOptions;
  private role_styles: RoleStyles;
  private doc_pages: DocPage[];
  private fonts: Array<{ name: string; path: string; variable?: boolean }>;
  private images: Array<{ name: string; path: string }>;

  constructor(options: DocOptions = {}) {
    this.options = { parse_markdown: true, ...options };
    this.role_styles = {};
    this.doc_pages = [];
    this.fonts = [];
    this.images = [];
  }

  set_style(styles: RoleStyles): this {
    this.role_styles = { ...this.role_styles, ...styles };
    return this;
  }

  set_header(header: HeaderFooter): this {
    this.options = { ...this.options, header };
    return this;
  }

  set_footer(footer: HeaderFooter): this {
    this.options = { ...this.options, footer };
    return this;
  }

  load_font(name: string, path: string, variable = false): this {
    this.fonts.push({ name, path, variable });
    return this;
  }

  load_image(name: string, path: string): this {
    this.images.push({ name, path });
    return this;
  }

  page(config?: PageConfig): DocPage {
    const page = new DocPage(config);
    this.doc_pages.push(page);
    return page;
  }

  async build(file_path: string): Promise<void> {
    const margin = sum_margin(
      normalize_margin(this.options.margin ?? 0),
      normalize_margin(this.options.padding ?? 0),
    );
    const document = new Document({ ...this.options, margin });
    this.fonts.forEach((f) =>
      document.load_font_sync(f.name, f.path, f.variable),
    );
    this.images.forEach((i) => document.load_image_sync(i.name, i.path));

    await document.prepare_pdf();

    const styles = this.role_styles;
    const builder = new Page(document);
    const content_width =
      document.page_width - margin.left - margin.right;
    const content_height =
      document.page_height - margin.top - margin.bottom;
    const date = new Date();
    const sample: PageContext = { page_number: 1, page_count: 1, date };

    const fonts = new Set<string>();
    this.doc_pages.forEach((doc_page) => {
      collect_formula_fonts(doc_page.get_blocks(), styles, fonts);
      collect_formula_fonts(
        resolve_hf(doc_page.get_header() ?? this.options.header, sample),
        styles,
        fonts,
      );
      collect_formula_fonts(
        resolve_hf(doc_page.get_footer() ?? this.options.footer, sample),
        styles,
        fonts,
      );
    });
    await Promise.all(
      [...fonts].map(async (name) => {
        const ok = await load_formula_font(name);
        if (!ok && name !== default_formula_font) {
          console.warn(
            `@nemu-ai/pdf: formula font "${name}" is not installed; run \`npm i @mathjax/mathjax-${name}-font\`. Using "${default_formula_font}".`,
          );
        }
      }),
    );

    const measure = (block: Block, with_margin = true): BaseElement => {
      const el = compile_block(block, builder, styles, with_margin);
      el._document = document;
      el.measure(content_width);
      return el;
    };

    const zone_height = (hf: HeaderFooter | undefined): number => {
      if (hf !== undefined && is_raw_draw(hf)) return hf.height;
      return resolve_hf(hf, sample).reduce(
        (sum, block) => sum + measure(block, false).measured_size!.height,
        0,
      );
    };

    const paginate = (
      elements: BaseElement[],
      avail: number,
    ): BaseElement[][] => {
      if (this.options.auto_paginate === false || elements.length === 0) {
        return [elements];
      }
      const groups: BaseElement[][] = [];
      let current: BaseElement[] = [];
      let used = 0;
      elements.forEach((el) => {
        const h = el.measured_size!.height;
        if (current.length > 0 && used + h > avail) {
          groups.push(current);
          current = [];
          used = 0;
        }
        current.push(el);
        used += h;
      });
      groups.push(current);
      return groups;
    };

    const physical: PhysicalPage[] = [];
    this.doc_pages.forEach((doc_page) => {
      const header = doc_page.get_header() ?? this.options.header;
      const footer = doc_page.get_footer() ?? this.options.footer;
      const avail = content_height - zone_height(header) - zone_height(footer);
      const elements = doc_page.get_blocks().map((b) => measure(b));
      paginate(elements, Math.max(1, avail)).forEach((group) =>
        physical.push({ elements: group, header, footer }),
      );
    });

    const page_count = physical.length;
    physical.forEach((ph, index) => {
      const page = document.create_page();
      page.add(...ph.elements);
      const ctx: PageContext = {
        page_number: index + 1,
        page_count,
        date,
      };
      const header = resolve_hf(ph.header, ctx);
      if (header.length > 0) {
        page
          .header_container()
          .add(...header.map((b) => compile_block(b, builder, styles, false)));
      }
      const footer = resolve_hf(ph.footer, ctx);
      if (footer.length > 0) {
        page
          .footer_container()
          .add(...footer.map((b) => compile_block(b, builder, styles, false)));
      }

      const header_raw =
        ph.header && is_raw_draw(ph.header) ? ph.header : null;
      const footer_raw =
        ph.footer && is_raw_draw(ph.footer) ? ph.footer : null;
      if (header_raw || footer_raw) {
        page.on_render = (pdoc) => {
          if (header_raw) {
            header_raw.draw(pdoc, {
              ...ctx,
              x: margin.left,
              y: margin.top,
              width: content_width,
              height: header_raw.height,
            } satisfies DrawArea);
          }
          if (footer_raw) {
            footer_raw.draw(pdoc, {
              ...ctx,
              x: margin.left,
              y: document.page_height - margin.bottom - footer_raw.height,
              width: content_width,
              height: footer_raw.height,
            } satisfies DrawArea);
          }
        };
      }
    });

    await document.render_to(file_path);
  }
}
