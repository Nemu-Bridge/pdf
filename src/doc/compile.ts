import type { Page } from "../document/document";
import type { BaseElement, TableCellInput } from "../document/elements";
import type { StyleProperties } from "../document/types";
import type { MarkdownSegment } from "../document/markdown";
import { color_css } from "../document/style";
import {
  resolve_style,
  heading_scale,
  default_role_margins,
  type BlockMargin,
} from "./styles";
import {
  to_inline_array,
  has_structured,
  inline_to_plain,
  to_segments,
  type SegmentOptions,
} from "./inline";
import { RichTextElement } from "./rich_text";
import { FormulaElement } from "./formula";
import { ChartElement } from "./chart";
import type {
  Block,
  Inline,
  InlineContent,
  RoleStyles,
  StyleRole,
  TableRow,
} from "./types";

const note_backgrounds: Record<string, string> = {
  info: "#eff2f6",
  warn: "#fdf3e3",
  success: "#edf6ef",
  muted: "#f3f4f6",
};

const cell_to_input = (
  cell: TableRow[number],
  set_styles: RoleStyles,
): string | TableCellInput => {
  if (typeof cell === "string") return cell;
  const content = to_inline_array(cell.text).map(inline_to_plain).join("");
  const style: StyleProperties | undefined = cell.align
    ? { text_align: cell.align }
    : undefined;
  if (has_structured(cell.text)) {
    return {
      content,
      segments: to_segments(cell.text, seg_options(set_styles, false)),
      style,
    };
  }
  return style ? { content, style } : content;
};

const link_color = (set_styles: RoleStyles): string =>
  color_css(resolve_style("link", undefined, set_styles).color) ?? "#000000";

const code_color = (set_styles: RoleStyles): string =>
  color_css(resolve_style("code", undefined, set_styles).color) ?? "#000000";

const code_font = (set_styles: RoleStyles): string =>
  resolve_style("code", undefined, set_styles).font_family ?? "Courier";

const seg_options = (
  set_styles: RoleStyles,
  markdown: boolean,
): SegmentOptions => ({
  link_color: link_color(set_styles),
  code_color: code_color(set_styles),
  code_font: code_font(set_styles),
  markdown,
});

const build_text = (
  page: Page,
  content: InlineContent,
  style: StyleProperties,
  set_styles: RoleStyles,
): BaseElement => {
  const nodes = to_inline_array(content);
  const has_formula = nodes.some(
    (n) => typeof n === "object" && n.type === "formula",
  );

  if (!has_formula) {
    if (!has_structured(content)) {
      return page.text({
        content: nodes.join(""),
        parse_markdown: !!style.text_markdown,
        style,
      });
    }
    return new RichTextElement(
      to_segments(content, seg_options(set_styles, !!style.text_markdown)),
      style,
    );
  }

  const container = page.create_container({ layout: { type: "flow", gap: 4 } });
  const formula_style = resolve_style("formula", undefined, set_styles);
  let run: Array<string | Inline> = [];

  const flush_run = (): void => {
    if (run.length === 0) return;
    const run_content: InlineContent = run.length === 1 ? run[0]! : run;
    if (has_structured(run_content)) {
      container.add(
        new RichTextElement(
          to_segments(
            run_content,
            seg_options(set_styles, !!style.text_markdown),
          ),
          style,
        ),
      );
    } else {
      container.add(
        page.text({
          content: to_inline_array(run_content).map(inline_to_plain).join(""),
          parse_markdown: !!style.text_markdown,
          style,
        }),
      );
    }
    run = [];
  };

  for (const node of nodes) {
    if (typeof node === "object" && node.type === "formula") {
      flush_run();
      container.add(new FormulaElement(node.text, formula_style));
    } else {
      run.push(node);
    }
  }
  flush_run();
  return container;
};

const build_list_item = (
  page: Page,
  item: InlineContent,
  ordered: boolean,
  index: number,
  style: StyleProperties,
  set_styles: RoleStyles,
): BaseElement => {
  const prefix = ordered ? `${index + 1}.  ` : "•  ";
  if (!has_structured(item)) {
    return page.text({
      content: prefix + to_inline_array(item).join(""),
      parse_markdown: !!style.text_markdown,
      style,
    });
  }
  const prefix_seg: MarkdownSegment = {
    text: prefix,
    bold: false,
    italic: false,
    strikethrough: false,
  };
  return new RichTextElement(
    [prefix_seg, ...to_segments(item, seg_options(set_styles, !!style.text_markdown))],
    style,
  );
};

const compile_inner = (
  block: Block,
  page: Page,
  set_styles: RoleStyles,
): BaseElement => {
  switch (block.type) {
    case "heading": {
      const level = block.level ?? 1;
      const base = resolve_style("heading", block.style, set_styles);
      const style = {
        ...base,
        font_size: base.font_size ?? heading_scale[level],
      };
      return build_text(page, block.text, style, set_styles);
    }
    case "paragraph":
      return build_text(
        page,
        block.text,
        resolve_style("paragraph", block.style, set_styles),
        set_styles,
      );
    case "code": {
      const style = resolve_style("code", block.style, set_styles);
      const text = page.text({
        content: block.text,
        parse_markdown: false,
        style: {
          font_family: style.font_family ?? "Courier",
          font_size: style.font_size,
          color: style.color,
          line_height: style.line_height,
        },
      });
      const container = page.create_container({
        layout: { type: "flow" },
        style: {
          background_color: style.background_color,
          padding: style.padding ?? 12,
        },
      });
      container.add(text);
      return container;
    }
    case "formula":
      return new FormulaElement(
        block.text,
        resolve_style("formula", block.style, set_styles),
      );
    case "list": {
      const style = resolve_style("list", block.style, set_styles);
      const container = page.create_container({
        layout: { type: "flow", gap: 3 },
      });
      container.add(
        ...block.items.map((item, i) =>
          build_list_item(
            page,
            item,
            block.ordered ?? false,
            i,
            style,
            set_styles,
          ),
        ),
      );
      return container;
    }
    case "image":
      return page.image({
        name: block.src,
        width: block.width,
        height: block.height,
      });
    case "divider": {
      const style = resolve_style("divider", block.style, set_styles);
      return page.rect({
        height: 1,
        shape_style: { fill_color: style.background_color ?? "#d4d4d4" },
      });
    }
    case "spacer":
      return page.create_container({
        height: block.size ?? 12,
        layout: { type: "flow" },
      });
    case "note": {
      const style = resolve_style("note", block.style, set_styles);
      const background =
        color_css(style.background_color) ??
        note_backgrounds[block.variant ?? "muted"];
      const container = page.create_container({
        layout: { type: "flow", gap: 4 },
        style: { background_color: background, padding: style.padding ?? 12 },
      });
      const text_style: StyleProperties = {
        color: style.color,
        font_family: style.font_family,
        font_size: style.font_size,
        line_height: style.line_height,
      };
      if (block.title !== undefined) {
        container.add(
          build_text(
            page,
            block.title,
            { ...text_style, font_family: "inter" },
            set_styles,
          ),
        );
      }
      container.add(build_text(page, block.text, text_style, set_styles));
      return container;
    }
    case "table": {
      const style = resolve_style("table", block.style, set_styles);
      const columns =
        block.columns ??
        block.headers?.length ??
        block.rows[0]?.length ??
        1;
      const table = page.table({
        columns,
        cell_padding: 7,
        border_color: "#e5e7eb",
        border_width: 0.75,
        header_style: {
          font_family: "inter",
          font_size: style.font_size ?? 10,
          background_color: "#f3f4f6",
          color: "#111827",
        },
        cell_style: {
          font_family: style.font_family ?? "source-serif-4",
          font_size: style.font_size ?? 10,
          color: style.color ?? "#1a1a1a",
        },
      });
      if (block.headers) {
        table.add_row(block.headers.map((c) => cell_to_input(c, set_styles)));
      }
      block.rows.forEach((row) =>
        table.add_row(row.map((c) => cell_to_input(c, set_styles))),
      );
      return table;
    }
    case "chart": {
      const style = resolve_style("chart", block.style, set_styles);
      return new ChartElement(
        block.chart,
        block.data,
        style,
        block.height,
        block.title,
        block.legend ?? true,
      );
    }
    case "group": {
      const style = resolve_style("group", block.style, set_styles);
      const container = page.create_container({
        layout: { type: "flow", gap: block.gap ?? 0 },
        style,
      });
      container.add(
        ...block.children.map((c) => compile_block(c, page, set_styles)),
      );
      return container;
    }
    default:
      throw new Error(
        `unknown block type: ${(block as { type: string }).type}`,
      );
  }
};

const margin_role: Record<Block["type"], StyleRole | null> = {
  heading: "heading",
  paragraph: "paragraph",
  code: "code",
  formula: "formula",
  list: "list",
  image: "paragraph",
  divider: "divider",
  group: "group",
  note: "note",
  table: "table",
  chart: "chart",
  spacer: null,
};

const to_num = (value: number | string | undefined): number | undefined =>
  typeof value === "number"
    ? value
    : typeof value === "string"
      ? parseFloat(value)
      : undefined;

interface Edges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const resolve_margin = (block: Block, set_styles: RoleStyles): Edges => {
  const role = margin_role[block.type];
  const def: BlockMargin = role
    ? default_role_margins[role]
    : { top: 0, bottom: 0 };
  const role_style = role ? (set_styles[role] ?? {}) : {};
  const block_style = (block as { style?: StyleProperties }).style ?? {};
  const style = { ...role_style, ...block_style };
  const all = to_num(style.margin);
  return {
    top: to_num(style.margin_top) ?? all ?? def.top,
    bottom: to_num(style.margin_bottom) ?? all ?? def.bottom,
    left: to_num(style.margin_left) ?? all ?? 0,
    right: to_num(style.margin_right) ?? all ?? 0,
  };
};

export const compile_block = (
  block: Block,
  page: Page,
  set_styles: RoleStyles,
  with_margin = true,
): BaseElement => {
  const inner = compile_inner(block, page, set_styles);
  if (!with_margin) return inner;
  const m = resolve_margin(block, set_styles);
  if (m.top === 0 && m.bottom === 0 && m.left === 0 && m.right === 0) {
    return inner;
  }
  const wrapper = page.create_container({
    layout: { type: "flow" },
    style: {
      padding_top: m.top,
      padding_bottom: m.bottom,
      padding_left: m.left,
      padding_right: m.right,
    },
  });
  wrapper.add(inner);
  return wrapper;
};
