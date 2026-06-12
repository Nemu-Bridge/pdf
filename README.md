# @nemu-ai/pdf

A modern PDF generation library for Node and Bun. It ships two APIs from one package: a
declarative `Doc` for writing documents as content blocks, and a low level `Document` for
placing elements with full control. Both render through a single measure, layout, render
engine that embeds fonts, draws vector graphics, and typesets LaTeX.

## Features

- Two APIs that share one engine: declarative `Doc` and imperative `Document`.
- Six variable fonts bundled and auto registered, with real weights from thin to black.
- LaTeX math typeset by MathJax into crisp vector paths.
- Native vector charts: bar, line, area, pie, donut.
- Tables with rich cells, notes, lists, code blocks, dividers, and images.
- Flex and flow containers, z index layering, and explicit positioning.
- Headers and footers as blocks, functions of page context, or raw drawing callbacks.
- Themes, role styles, and a small `Color` utility.
- Works on plain Node 18+ and Bun, in both ESM and CommonJS.

## Install

```bash
npm install @nemu-ai/pdf
# or
bun add @nemu-ai/pdf
```

Fonts and the font instancer are bundled, so nothing else is required. The default math
font for LaTeX is included; additional math fonts are optional installs.

## Choosing an API

Use `Doc` for documents: reports, articles, invoices, anything that is content first. You
describe blocks and the library handles layout, pagination, headers, and footers.

Use `Document` when you need exact coordinates, custom layouts, overlapping elements, or
fine control over every element. `Doc` itself compiles down to `Document`, so you can mix
mental models freely.

---

# Doc: the declarative API

A `Doc` is a sequence of pages, and each page is a list of content blocks. Set role styles
once, add content, and call `build`.

```ts
import { Doc } from "@nemu-ai/pdf";

const doc = new Doc({ page_size: "A4", margin: 54, padding: 10 });

doc.set_style({
  heading: { font_family: "inter", color: "#111827" },
  paragraph: { font_family: "source-serif-4", font_size: 11.5, line_height: 1.6 },
  link: { color: "#2563eb" },
});

doc.page().content(
  { type: "heading", text: "Quarterly Report", level: 1 },
  { type: "paragraph", text: "Revenue grew across every region this quarter." },
  { type: "note", variant: "info", title: "Note", text: "Figures are unaudited." },
);

await doc.build("report.pdf");
```

## Doc methods

```ts
new Doc(options?: DocOptions)
doc.set_style(styles: RoleStyles): this
doc.set_header(header: HeaderFooter): this
doc.set_footer(footer: HeaderFooter): this
doc.load_font(name: string, path: string, variable?: boolean): this
doc.load_image(name: string, path: string): this
doc.page(config?: PageConfig): DocPage
await doc.build(file_path: string): Promise<void>

page.content(...items: Array<Block | Block[]>): this
```

`new Doc(options)` turns markdown parsing on for plain strings by default. `content`
flattens arrays, so a component that returns `Block[]` can be spread inline. `build` writes
the file and is always awaited. `margin` plus `padding` form the page content inset, and
`auto_paginate` is on unless you set it to `false`.

## Blocks

Every block is a tagged object. A block level `style` overrides the role style for that one
block.

```ts
{ type: "heading", text: "Title", level: 2 }
{ type: "paragraph", text: "Body text." }
{ type: "code", text: "const x = 1;", language: "ts" }
{ type: "formula", text: "E = mc^2" }
{ type: "list", items: ["First", "Second"], ordered: true }
{ type: "image", src: "logo", width: 120, height: 40 }
{ type: "divider" }
{ type: "spacer", size: 16 }
{ type: "note", variant: "warn", title: "Careful", text: "Provisional value." }
{ type: "table", headers: ["A", "B"], rows: [["1", "2"]] }
{ type: "chart", chart: "bar", data: { labels: ["Q1"], series: [{ values: [10] }] } }
{ type: "group", children: [/* blocks kept together across page breaks */] }
```

`group` prevents its children from splitting across a page break, which is the natural way
to keep a heading with its first paragraph. `spacer` adds vertical space, `divider` draws a
rule, and `image` references a path or a name registered with `load_image`.

## Inline content

Wherever a block takes `text`, it accepts a string, a single inline node, or an array
mixing both. Inline nodes nest, so a link can wrap a formula and a strong run can wrap a
link.

```ts
{
  type: "paragraph",
  text: [
    "See the ",
    { type: "link", href: "https://example.com", text: { type: "strong", text: "spec" } },
    " and the identity ",
    { type: "formula", text: "e^{i\\pi} + 1 = 0" },
    ".",
  ],
}
```

Inline node types are `strong`, `em`, `strike`, `link` with `href`, `formula`, and `code`.
When markdown is enabled, plain strings also honor `**bold**`, `*italic*`, `~~strike~~`,
and `$inline math$`. For generated content, structured inline nodes are the reliable path.

## Styling and roles

Styles are plain objects. `set_style` sets a default per role, and a block `style` merges
on top. The roles are `heading`, `paragraph`, `code`, `formula`, `list`, `link`, `group`,
`divider`, `note`, `table`, and `chart`.

```ts
doc.set_style({
  heading: { font_family: "inter", font_weight: "bold", color: "#0f172a" },
  paragraph: { font_family: "source-serif-4", font_size: 12, line_height: 1.6 },
  code: { font_family: "geist-mono", background_color: "#f6f8fa" },
  note: { color: "#1f2937" },
});
```

The style fields used most in documents are `color`, `background_color`, `font_family`,
`font_size`, `font_weight`, `line_height`, `text_align`, `margin`, and `padding`. Colors
accept a hex string or a `Color`. See Fonts and weights for `font_weight`.

## Fonts and weights

Six variable fonts are bundled and registered automatically. Use them by name:

| Name | Style |
| --- | --- |
| `inter` | sans serif |
| `geist` | sans serif |
| `geist-mono` | monospace |
| `nunito-sans` | sans serif |
| `roboto` | sans serif |
| `source-serif-4` | serif |

`font_weight` selects a real weight by instancing the variable font. Names map to the
usual axis values and numbers pass straight through.

```ts
{ type: "paragraph", text: "Heavy", style: { font_family: "inter", font_weight: "black" } }
{ type: "paragraph", text: "Light", style: { font_family: "inter", font_weight: 300 } }
```

Weight names: `thin` 100, `extralight` 200, `light` 300, `regular` 400, `medium` 500,
`semibold` 600, `bold` 700, `extrabold` 800, `black` 900. Markdown `**bold**` and the
`strong` inline node also produce a real bold weight. The bundled fonts are upright only,
so italic renders upright. To use a custom variable font with weights, register it with
`doc.load_font(name, path, true)`.

## Formulas

Block and inline `formula` text is LaTeX, typeset by MathJax into vector paths. The default
math font is `termes`. Other fonts are optional installs.

```ts
import { available_formula_fonts, default_formula_font } from "@nemu-ai/pdf";
// available_formula_fonts -> ["termes", "newcm", "modern", "pagella", "stix2", "fira"]
// default_formula_font    -> "termes"

doc.set_style({ formula: { font: "termes", font_size: 13, color: "#111827" } });

doc.page().content(
  { type: "formula", text: "\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}" },
);
```

A non default font needs its package, for example `npm i @mathjax/mathjax-pagella-font`. A
missing font logs a warning and falls back to `termes`.

## Tables

```ts
{
  type: "table",
  headers: ["Metric", "Q3", "Q4"],
  rows: [
    ["Revenue", "1.2M", { text: { type: "strong", text: "1.6M" }, align: "right" }],
    ["Margin", "18%", { text: "24%", align: "right" }],
  ],
}
```

A cell is a string or `{ text, align }`, where `text` is inline content. Bold, links, and
inline formulas all work inside cells. `columns` is optional; omit it to size columns
equally from the header or first row. Set it to a count for equal columns, or to an array
of absolute widths in points where `0` means auto.

## Charts

Charts render as native vector graphics with no image step.

```ts
{
  type: "chart",
  chart: "bar",
  title: "Revenue by quarter",
  legend: true,
  height: 220,
  data: {
    labels: ["Q1", "Q2", "Q3", "Q4"],
    series: [
      { name: "2024", values: [12, 19, 14, 23], color: "#111827" },
      { name: "2025", values: [16, 22, 20, 28], color: "#9ca3af" },
    ],
  },
}
```

`bar`, `line`, and `area` read `labels` and `series`. `pie` and `donut` read `slices`,
where each slice is `{ label, value, color? }`.

## Headers, footers, and raw drawing

A header or footer is a block, an array of blocks, a function of page context, or a raw
draw callback. Functions run per page at build time.

```ts
doc.set_footer((ctx) => ({
  type: "paragraph",
  text: `Page ${ctx.page_number} of ${ctx.page_count}`,
  style: { font_size: 9, color: "#9ca3af", text_align: "right" },
}));

doc.set_header({
  height: 40,
  draw: (pdoc, area) => {
    pdoc.rect(area.x, area.y + area.height - 1, area.width, 1).fill("#e5e7eb");
  },
});
```

The page context is `{ page_number, page_count, date }`. The raw draw callback receives the
live pdfkit document and the zone rectangle `{ x, y, width, height }` plus the page context.
Set per page headers and footers through `doc.page({ header, footer })`.

## Reusable components

A component is a function that returns a block or an array of blocks. Spread it into
`content`.

```ts
const section = (title: string, body: InlineContent): Block[] => [
  { type: "heading", text: title, level: 2 },
  { type: "paragraph", text: body },
];

doc.page().content(
  ...section("Overview", "What this document covers."),
  { type: "note", variant: "info", text: "Spread arrays of blocks directly." },
);
```

See `examples/simplified` for a full multi page Doc reference document.

---

# Document: the low level API

`Document` places elements directly. You create pages, build elements with the page
factories, add them to the page or to containers, and call `build`. Elements flow top to
bottom by default, or sit at explicit coordinates when given a `position`.

```ts
import { Document } from "@nemu-ai/pdf";

const pdf = new Document({ page_size: "A4", margin: 50 });
const page = pdf.create_page();

page.add(
  page.text({ content: "Invoice", style: { font_size: 28, font_weight: "bold" } }),
  page.text({ content: "Thank you for your business.", style: { color: "#6b7280" } }),
);

await pdf.build("invoice.pdf");
```

The pipeline runs in three passes. Measure computes each element's intrinsic size from font
metrics. Layout assigns positions from the page margin and header zone. Render draws every
element in z index order.

## Document and Page

```ts
new Document(options?: DocumentOptions)
pdf.create_page(theme?: Theme): Page
pdf.add_page(): Page
pdf.set_theme(theme: Theme): void
pdf.load_font_sync(name: string, file_path: string, variable?: boolean): void
pdf.load_image_sync(name: string, file_path: string): void
await pdf.build(file_path: string): Promise<void>
```

`DocumentOptions` are `page_size` (`"A4" | "Letter" | "Legal" | "Custom"`),
`custom_dimensions` (`{ width, height }` in points), `margin` (a number or per side values),
and `parse_markdown`. `build` is the full pipeline; it is split internally into
`prepare_pdf` and `render_to` so a caller can measure before rendering.

The page factories build elements but do not place them. Add what you build with `page.add`
or a container's `add`.

```ts
page.text(options: CreateTextOptions): TextElement
page.rect(options: CreateRectOptions): RectElement
page.image(options: CreateImageOptions): ImageElement
page.table(options: CreateTableOptions): TableElement
page.create_container(options?: CreateContainerOptions): ContainerElement
page.header_container(options?: CreateContainerOptions): HeaderContainer
page.footer_container(options?: CreateContainerOptions): FooterContainer
page.add(...elements: BaseElement[]): this
```

`header_container` and `footer_container` are idempotent and return the existing zone if
called again. The page also exposes `get_content_width()` and `get_content_height()` along
with margin helpers.

## Text, rectangles, and images

```ts
const label = page.text({
  content: "Absolute label",
  position: { x: 100, y: 200 },
  style: { font_size: 11 },
});

const card = page.rect({
  width: 400,
  height: 120,
  shape_style: { fill_color: "#1a365d", border_radius: 10 },
});

pdf.load_image_sync("logo", "./assets/logo.png");
const img = page.image({ name: "logo", width: 120, height: 40 });

page.add(label, card, img);
```

A `position` makes an element explicit and absolute. Without one it joins the flow.
Rectangle colors come from `style.background_color` or a `shape_style` with `fill_color`,
`stroke_color`, `stroke_width`, and `border_radius`. Images reference a name registered with
`load_image_sync`.

## Overlay children and z index

Any element can own overlay children built with `element.text`, `element.rect`,
`element.image`, or `element.create_container`. Children are positioned relative to the
parent's top left corner and render on top of it, sorted by z index.

```ts
const box = page.rect({
  width: 300,
  height: 80,
  shape_style: { fill_color: "#2b6cb0", border_radius: 8 },
});
box.text({
  content: "Rendered on top of the box.",
  style: { color: "#ffffff", padding: 12 },
  z_index: 1,
});
page.add(box);
```

Within the same parent, elements render in ascending z index order regardless of
declaration order.

## Containers and layout

A container groups children with a flow or flex layout.

```ts
const row = page.create_container({
  layout: { type: "flex", direction: "row", justify: "space-between", align: "center", gap: 12 },
  width: page.get_content_width(),
});
row.add(
  page.text({ content: "Left" }),
  page.text({ content: "Right" }),
);
page.add(row);
```

Flow stacks children vertically with an optional `gap`. Flex distributes them along a row or
column. `justify` is one of `flex-start`, `flex-end`, `center`, `space-between`,
`space-around`, `space-evenly`. `align` is one of `flex-start`, `flex-end`, `center`,
`stretch`, `baseline`. Containers also accept `style`, `width`, `height`, `position`, and
`classname`.

## Tables

```ts
const table = page.table({
  columns: [180, 0, 100],
  border_width: 0.5,
  cell_padding: 8,
  header_style: { background_color: "#ebf4ff" },
  width: page.get_content_width(),
});
table.add_row(["Name", "Role", "Status"]);
table.add_row(["Alice Nguyen", "Lead Engineer", "Active"]);
table.add_row([
  { content: "Bob Chen", style: { color: "#718096" } },
  "Designer",
  "Active",
]);
page.add(table);
```

`columns` is an equal count or an array of widths, where `0` means auto width. Each cell is
a string or `{ content, style }`. Borders are controlled by `border_color`, `border_width`,
and `cell_padding`.

## Themes

A theme centralizes named colors and applies default styles by element type and classname.

```ts
import { Document, create_theme } from "@nemu-ai/pdf";

const theme = create_theme("brand", {
  colors: { primary: "#1a365d", muted: "#718096", accent: "#3182ce" },
});

const pdf = new Document({ page_size: "A4", margin: 50 });
pdf.set_theme(theme);
const page = pdf.create_page(theme);
theme.get_color("primary");
```

See `examples/showcase` for a full multi page Document built with a theme.

---

# Color

`Color` builds a color from one input form and converts to any other. Construct it as a
call or with `new`; both work, and you cannot mix input forms.

```ts
import { Color } from "@nemu-ai/pdf";

const a = Color({ hex: "#2563eb" });
const b = new Color({ rgb: [37, 99, 235] });
const c = Color({ hsl: [217, 91, 60] });

a.to_hex();    // "#2563eb"
a.to_rgba();   // "rgba(37, 99, 235, 1)"
a.alpha(0.5);  // a Color at 50% opacity
a.lighten(0.1);
a.darken(0.1);
a.mix(b, 0.5);
a.is_dark();   // true
```

Input forms are `{ hex }`, `{ rgb }`, `{ rgba }`, `{ hsl }`, and `{ hsla }`. A `Color` is
accepted anywhere a color is, so any `color` or `background_color` field takes a hex string
or a `Color`.

---

# Reference

## Page sizes

| Name | Width (pt) | Height (pt) |
| --- | --- | --- |
| A4 | 595.28 | 841.89 |
| Letter | 612 | 792 |
| Legal | 612 | 1008 |

Use `custom_dimensions` for any other size.

```ts
const pdf = new Document({ custom_dimensions: { width: 400, height: 600 } });
```

## Vector

`Vector` is the spatial primitive for positions and sizes. `vector(x, y)` is a convenience
constructor. After `build`, elements expose `get_position()`, `get_size()`, and
`get_bbox()`.

```ts
import { vector } from "@nemu-ai/pdf";
const v = vector(100, 200); // v.x === 100, v.y === 200
```

## Types

All of the following are exported as types: `Block`, `Inline`, `InlineContent`, `DocOptions`,
`PageConfig`, `PageContext`, `HeaderFooter`, `RawDraw`, `DrawArea`, `RoleStyles`,
`StyleRole`, `TableCell`, `TableRow`, `ChartKind`, `ChartData`, `ChartSeries`, `ChartSlice`,
`StyleProperties`, `DocumentOptions`, `PageSize`, `PageDimensions`, `MarginValues`,
`ColorLike`, `ColorInput`, `ColorValue`, `ContainerLayout`, `FlexLayoutOptions`,
`FlowLayoutOptions`, `CreateTextOptions`, `CreateRectOptions`, `CreateImageOptions`,
`CreateTableOptions`, and `CreateContainerOptions`.

For an API map aimed at language models, see `llms.txt`.

## License

MIT. Bundled fonts are licensed under the SIL Open Font License; see `dist/fonts/OFL.txt`.
