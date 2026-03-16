# @nemu-ai/pdf

A TypeScript library for generating PDFs programmatically. It builds on PDFKit and adds a structured element tree, a three-pass layout engine (measure, layout, render), composable flex and flow containers, header and footer zones, parent-child element relationships, z-index layering, theming, and inline markdown and LaTeX parsing.

## Installation

```bash
bun add @nemu-ai/pdf
# or
npm install @nemu-ai/pdf
```

## Quick start

```typescript
import { Document } from "@nemu-ai/pdf";

const doc = new Document({ page_size: "A4", margin: 50 });
const page = doc.create_page();

page.add(
  page.text({ content: "Hello, world!", style: { font_size: 24 } }),
  page.text({ content: "Generated with @nemu-ai/pdf." }),
);

await doc.build("output.pdf");
```

## Design overview

The library follows a three-pass pipeline:

1. **Measure** - each element computes its intrinsic size using PDFKit font metrics.
2. **Layout** - positions are computed top-down from the page margin and header zone height.
3. **Render** - elements draw themselves to PDFKit in z-index order.

You build the element tree before calling `build()`. Factory methods on `Page` create elements; `page.add()` places them in the page's flow. Container elements have their own `add()` method for nesting children. Any element can also own overlay children created via `element.text()`, `element.rect()`, etc., which render on top of the parent positioned relative to its top-left corner.

---

## Classes

### Document

The root object. Holds page dimensions, margin, font registrations, and the list of pages.

```typescript
new Document(options?: DocumentOptions)
```

**Options**

| Property | Type | Default | Description |
|---|---|---|---|
| `page_size` | `PageSize` | `"A4"` | Named page size. |
| `custom_dimensions` | `PageDimensions` | - | Explicit `{ width, height }` in points. Takes precedence over `page_size`. |
| `margin` | `number \| MarginValues` | `72` | Page margin in points. A single number sets all four sides equally. |
| `parse_markdown` | `boolean` | `false` | Enables inline markdown parsing globally for all text elements. |

**Methods**

`create_page(theme?: Theme): Page`
Creates a new page and appends it to the document. The optional theme overrides the document's default theme for this page.

`add_page(): Page`
Alias for `create_page()` with no theme argument.

`set_theme(theme: Theme): void`
Sets the default theme applied to every page unless overridden at page creation.

`load_font(name: string, path: string): Promise<void>`
`load_font_sync(name: string, path: string): void`
Registers a custom TTF or OTF font under `name`. The name is then used in `style.font_family`. Custom fonts must be loaded before calling `build()`.

```typescript
await doc.load_font("NotoSans", "./fonts/NotoSans-Regular.ttf");
await doc.load_font("NotoSans-Bold", "./fonts/NotoSans-Bold.ttf");
```

`load_image(name: string, path: string): Promise<void>`
`load_image_sync(name: string, path: string): void`
Registers an image under `name` for use with `page.image({ name })`.

`build(file_path: string): Promise<void>`
Runs the full measure-layout-render pipeline for every page and writes the PDF to `file_path`.

**Properties**

| Property | Type | Description |
|---|---|---|
| `page_width` | `number` | Page width in points. |
| `page_height` | `number` | Page height in points. |
| `margin` | `MarginValues` | Resolved margin with `top`, `right`, `bottom`, `left` fields. |
| `pages` | `Page[]` | All pages in declaration order. |

---

### Page

Represents one page. You obtain it from `doc.create_page()`. Do not construct it directly.

**Header and footer zones**

```typescript
page.header_container(options?: CreateContainerOptions): HeaderContainer
page.footer_container(options?: CreateContainerOptions): FooterContainer
```

Both methods are idempotent - calling them more than once returns the existing zone. The header sits at the top margin; the footer sits at the bottom margin. Their heights are determined by their content at measure time, and the body content area is inset accordingly.

```typescript
const header = page.header_container({ style: { padding_bottom: 12 } });
header.add(
  page.text({ content: "My report", style: { font_size: 10 } }),
);
```

**Element factories**

All factory methods return an element reference. The element is not placed on the page until you call `page.add()` or include it inside a container via `container.add()`.

`page.text(options: CreateTextOptions): TextElement`
`page.rect(options: CreateRectOptions): RectElement`
`page.image(options: CreateImageOptions): ImageElement`
`page.table(options: CreateTableOptions): TableElement`
`page.create_container(options?: CreateContainerOptions): ContainerElement`

**Placing elements**

`page.add(...elements: BaseElement[]): this`
Appends elements to the page's root flow. Returns the page for chaining.

**Dimension helpers**

| Method | Returns |
|---|---|
| `get_width()` | Page width in points |
| `get_height()` | Page height in points |
| `get_content_width()` | Page width minus left and right margin |
| `get_content_height()` | Page height minus top and bottom margin |
| `get_margin_left()` | Left margin |
| `get_margin_right()` | Right margin |
| `get_margin_top()` | Top margin |
| `get_margin_bottom()` | Bottom margin |

---

### BaseElement

Abstract base class for all element types. You never construct this directly.

**Properties**

| Property | Type | Description |
|---|---|---|
| `id` | `symbol` | Unique identity for this element instance. |
| `layout_mode` | `LayoutMode` | `"flow"` or `"explicit"`. Set automatically based on whether `position` is provided. |
| `z_index` | `number` | Draw order within the same parent. Higher values render on top. Default is `0`. |
| `measured_size` | `MeasuredSize \| null` | Set after the measure pass. |
| `computed_position` | `Vector \| null` | Set after the layout pass. |
| `computed_size` | `Vector \| null` | Set after the layout pass. |

**Introspection methods** (available after `build()`)

`get_position(): Vector` - throws if called before `build()`.
`get_size(): Vector` - throws if called before `build()`.
`get_bbox(): BoundingBox` - returns `{ x, y, width, height }`.

**Child factory methods**

Any element can own overlay children. These children are positioned relative to the parent element's top-left corner and rendered on top of it, sorted by z-index.

`element.text(options: CreateTextOptions): TextElement`
`element.rect(options: CreateRectOptions): RectElement`
`element.image(options: CreateImageOptions): ImageElement`
`element.create_container(options?: CreateContainerOptions): ContainerElement`

```typescript
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

Children with `position` are offset from the parent's top-left corner. Children without `position` render at the parent's top-left corner.

```typescript
box.text({
  content: "Bottom right label",
  position: { x: 200, y: 56 },
  z_index: 1,
  style: { font_size: 9 },
});
```

---

### TextElement

Renders a string of text. Supports inline markdown and LaTeX when enabled.

**Options: `CreateTextOptions`**

| Property | Type | Description |
|---|---|---|
| `content` | `string` | The text to render. Required. |
| `style` | `StyleProperties` | Visual styling. |
| `classname` | `string` | Theme class name to merge. |
| `position` | `VectorLike` | If set, the element uses explicit layout mode and is placed at this offset from the content origin (or parent top-left). |
| `width` | `number` | Wrap width in points. Defaults to the available width from the parent. |
| `parse_markdown` | `boolean` | Overrides the document-level `parse_markdown` flag for this element. |
| `z_index` | `number` | Draw order. Default `0`. |

**Layout modes**

When `position` is omitted, the element participates in flow layout and the parent places it. When `position` is provided, the parent positions it at that offset and does not advance the cursor past it.

```typescript
const label = page.text({
  content: "Absolute label",
  position: { x: 100, y: 200 },
});
page.add(label);
```

---

### RectElement

Draws a filled and/or stroked rectangle.

**Options: `CreateRectOptions`**

| Property | Type | Description |
|---|---|---|
| `style` | `StyleProperties` | General styling (padding, background color). |
| `shape_style` | `ShapeStyle` | Fill color, stroke color, stroke width, border radius. |
| `position` | `VectorLike` | Explicit position offset if needed. |
| `width` | `number` | Width in points. Defaults to available width. |
| `height` | `number` | Height in points. Defaults to `0`. |
| `z_index` | `number` | Draw order. Default `0`. |

```typescript
const card = page.rect({
  width: 400,
  height: 120,
  shape_style: {
    fill_color: "#1a365d",
    border_radius: 10,
  },
});
page.add(card);
```

---

### ImageElement

Embeds a registered image.

**Options: `CreateImageOptions`**

| Property | Type | Description |
|---|---|---|
| `name` | `string` | The name used when calling `doc.load_image()`. Required. |
| `position` | `VectorLike` | Explicit position offset if needed. |
| `width` | `number` | Rendered width in points. |
| `height` | `number` | Rendered height in points. |
| `z_index` | `number` | Draw order. Default `0`. |

```typescript
await doc.load_image("logo", "./assets/logo.png");

const img = page.image({ name: "logo", width: 120, height: 40 });
page.add(img);
```

---

### ContainerElement

Groups child elements and controls how they are arranged. The two layout strategies are flow (vertical stacking) and flex (row or column with alignment).

**Options: `CreateContainerOptions`**

| Property | Type | Description |
|---|---|---|
| `layout` | `ContainerLayout` | Flow or flex layout configuration. Defaults to `{ type: "flow" }`. |
| `style` | `StyleProperties` | Padding, background color. |
| `classname` | `string` | Theme class name to merge. |
| `position` | `VectorLike` | Explicit position offset if needed. |
| `width` | `number` | Width in points. Defaults to available width. |
| `height` | `number` | Height in points. If omitted, height is derived from children. |
| `z_index` | `number` | Draw order. Default `0`. |

**Methods**

`add(...elements: BaseElement[]): this`
Adds layout children to this container. Children flow or flex inside the container's padded area.

`get_elements(): BaseElement[]`
Returns a copy of the layout children array.

**Flow layout**

Children stack vertically with an optional gap.

```typescript
const stack = page.create_container({
  layout: { type: "flow", gap: 8 },
  style: { padding: 16, background_color: "#f7fafc" },
  width: 400,
});
stack.add(
  page.text({ content: "First item" }),
  page.text({ content: "Second item" }),
  page.text({ content: "Third item" }),
);
page.add(stack);
```

**Flex layout**

Children are distributed along a row or column.

```typescript
const row = page.create_container({
  layout: {
    type: "flex",
    direction: "row",
    justify: "space-between",
    align: "center",
    gap: 12,
  },
  width: 500,
  height: 48,
});
row.add(
  page.text({ content: "**Label**" }),
  page.text({ content: "$42,000" }),
);
page.add(row);
```

`FlexLayoutOptions` fields:

| Property | Type | Default | Description |
|---|---|---|---|
| `type` | `"flex"` | required | |
| `direction` | `FlexDirection` | required | `"row"` or `"column"`. |
| `justify` | `FlexJustify` | `"flex-start"` | Main-axis alignment. |
| `align` | `FlexAlign` | `"flex-start"` | Cross-axis alignment. |
| `gap` | `number` | `0` | Gap between children in points. |

`justify` values: `"flex-start"`, `"flex-end"`, `"center"`, `"space-between"`, `"space-around"`, `"space-evenly"`.
`align` values: `"flex-start"`, `"flex-end"`, `"center"`, `"stretch"`, `"baseline"`.

---

### TableElement

Renders a grid with optional header row styling, cell padding, and borders.

**Options: `CreateTableOptions`**

| Property | Type | Description |
|---|---|---|
| `columns` | `number \| number[]` | Number of equal columns, or an array of column widths in points. Use `0` for auto-width columns. |
| `style` | `StyleProperties` | Base text style applied to all cells. |
| `width` | `number` | Total table width in points. Defaults to available width. |
| `border_color` | `string` | Hex color for cell borders. Default `"#e2e8f0"`. |
| `border_width` | `number` | Border stroke width. Default `1`. Set to `0` to hide borders. |
| `cell_padding` | `number` | Inner padding for each cell in points. Default `8`. |
| `header_style` | `StyleProperties` | Style applied to the first row. |
| `cell_style` | `StyleProperties` | Style applied to all non-header cells. |
| `position` | `VectorLike` | Explicit position if needed. |
| `z_index` | `number` | Draw order. Default `0`. |

**Methods**

`add_row(cells: Array<string | TableCellInput>): this`
Appends a row. The first row receives `header_style`. Each cell can be a plain string or `{ content: string, style: StyleProperties }` for per-cell overrides.

```typescript
const table = page.table({
  columns: [200, 0, 100],
  border_color: "#cbd5e0",
  border_width: 0.5,
  cell_padding: 8,
  header_style: { background_color: "#ebf4ff", font_size: 11 },
  cell_style: { font_size: 11 },
});
table.add_row(["Name", "Role", "Status"]);
table.add_row(["Alice", "Engineer", "Active"]);
table.add_row([
  { content: "Bob", style: { color: "#718096" } },
  "Designer",
  { content: "Inactive", style: { color: "#c53030" } },
]);
page.add(table);
```

---

### HeaderContainer / FooterContainer

Extend `ContainerElement`. Use `page.header_container()` and `page.footer_container()` - do not construct directly.

Their height (`zone_height`) is determined during the measure pass and is used by the layout engine to push the body content area down (header) or constrain it from the bottom (footer).

---

## Styling

The `StyleProperties` object controls typography and spacing. All properties are optional.

| Property | Type | Description |
|---|---|---|
| `font_family` | `string` | Font name. Defaults to `"Helvetica"`. |
| `font_size` | `number` | Font size in points. Default `12`. |
| `font_weight` | `string` | `"bold"` or `"normal"`. |
| `font_style` | `string` | `"italic"` or `"normal"`. |
| `color` | `string` | Text color as a hex string, e.g. `"#1a365d"`. |
| `background_color` | `string` | Background fill color. |
| `text_align` | `string` | `"left"`, `"center"`, `"right"`, `"justify"`. |
| `line_height` | `number` | Line height multiplier. Default `1.2`. |
| `padding` | `number` | Shorthand for all four sides. |
| `padding_top` | `number` | Top padding in points. |
| `padding_right` | `number` | Right padding in points. |
| `padding_bottom` | `number` | Bottom padding in points. |
| `padding_left` | `number` | Left padding in points. |

Padding affects both measured size and text render position. A text element with `padding: 12` starts its text 12 points from its computed top-left corner.

---

### ShapeStyle

Controls the visual appearance of `RectElement`.

| Property | Type | Description |
|---|---|---|
| `fill_color` | `string` | Fill color as a hex string. |
| `stroke_color` | `string` | Stroke color. |
| `stroke_width` | `number` | Stroke line width in points. |
| `border_radius` | `number` | Corner radius in points. |

---

## Theming

Themes centralize colors and element styles. You create a theme once and apply it at the document or page level.

```typescript
import { Document, create_theme } from "@nemu-ai/pdf";

const theme = create_theme("brand", {
  colors: {
    primary: "#1a365d",
    muted: "#718096",
  },
});

const doc = new Document({ page_size: "A4", margin: 50 });
doc.set_theme(theme);
```

`create_theme(name: string, config: ThemeConfig): Theme`
Creates and returns a `Theme` instance.

`theme.get_color(name: string): string`
Returns the hex color registered under `name`. Throws if not found.

`theme.merge_classname(style: StyleProperties, classname: string): StyleProperties`
Returns a new style that is the base merged with the class definition for `classname`.

`theme.apply_to_style(style: StyleProperties, element_type: string): StyleProperties`
Returns a style with default element-level properties applied.

---

## Markdown parsing

Inline markdown is supported when `parse_markdown: true` is set on the document or on an individual text element.

| Syntax | Result |
|---|---|
| `**text**` or `__text__` | Bold |
| `*text*` or `_text_` | Italic |
| `***text***` or `___text___` | Bold and italic |
| `~~text~~` | Strikethrough |
| `$formula$` | Inline LaTeX, converted to readable text |
| `$$formula$$` | Block LaTeX, converted to readable text |

```typescript
const doc = new Document({ parse_markdown: true });
const page = doc.create_page();

page.add(
  page.text({
    content: "The **Q4 revenue** grew by *32%*, with ***record margins*** in all segments. ~~Previous guidance~~ is revised.",
  }),
);
```

You can override the document setting per element:

```typescript
page.add(
  page.text({
    content: "Raw **asterisks** not parsed.",
    parse_markdown: false,
  }),
);
```

---

## LaTeX support

Math expressions inside `$...$` (inline) or `$$...$$` (display) are parsed and converted to readable text using a symbol table. The output is rendered in italic.

```typescript
page.add(
  page.text({ content: "Pythagorean theorem: $a^2 + b^2 = c^2$" }),
  page.text({ content: "Quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$" }),
);
```

**Font support**

Standard built-in PDF fonts (Helvetica, Times-Roman, Courier) only cover the Latin-1 character set (U+0000 to U+00FF). Operators such as `\times` (x), `\div` (div), and `\pm` (+/-) map to Latin-1 characters and render correctly. Greek letters (`\alpha`, `\beta`, etc.) and most math symbols fall outside Latin-1 and are rendered as ASCII text approximations (e.g. `alpha`, `beta`) unless you register a Unicode font.

To render proper Greek and math symbols, register a Unicode-capable font such as NotoSans:

```typescript
await doc.load_font("NotoSans", "./fonts/NotoSans-Regular.ttf");
await doc.load_font("NotoSans-Bold", "./fonts/NotoSans-Bold.ttf");

page.add(
  page.text({
    content: "Euler's identity: $e^{i\\pi} + 1 = 0$",
    style: { font_family: "NotoSans" },
  }),
);
```

---

## Z-index and layering

Every element has a `z_index` property. Within the same parent, elements are rendered in ascending z-index order regardless of declaration order.

Root page elements use z-index to sort the final render pass. Container children are sorted within their container. Overlay children (created via `element.text()`, `element.rect()`, etc.) are sorted separately and always render after the parent.

```typescript
const base = page.rect({ width: 400, height: 80, shape_style: { fill_color: "#1a365d" }, z_index: 0 });
const top = page.rect({ shape_style: { fill_color: "#3182ce" }, position: { x: 20, y: 10 }, z_index: 2 });
const mid = page.rect({ shape_style: { fill_color: "#63b3ed" }, position: { x: 40, y: 20 }, z_index: 1 });
page.add(base, top, mid);
```

Note that explicit-positioned root elements are placed relative to the page content origin, not the current cursor. To make layered explicit elements relative to each other, put them inside a container:

```typescript
const layer = page.create_container({ width: 400, height: 80 });
layer.add(base, top, mid);
page.add(layer);
```

---

## Explicit positioning

Set `position` on an element to place it at a fixed offset rather than in the automatic flow. For root elements, the offset is relative to the top-left of the content area. For elements inside a container, the offset is relative to the container's inner top-left corner (after padding).

```typescript
const info = page.rect({ width: 300, height: 80, shape_style: { fill_color: "#faf5ff" } });
info.text({ content: "Top left",     position: { x: 8, y: 8 },    z_index: 1, style: { font_size: 9 } });
info.text({ content: "Bottom right", position: { x: 208, y: 60 }, z_index: 1, style: { font_size: 9 } });
info.text({ content: "Center",       position: { x: 120, y: 34 }, z_index: 1, style: { font_size: 11 } });
page.add(info);
```

---

## Multi-page documents

Call `doc.create_page()` once per page. Each page is processed independently by the layout engine.

```typescript
const doc = new Document({ page_size: "A4", margin: 50 });

for (let i = 1; i <= 5; i++) {
  const page = doc.create_page();
  page.add(
    page.text({ content: `Page ${i}`, style: { font_size: 24 } }),
  );
}

await doc.build("multi.pdf");
```

---

## Complete example

```typescript
import { Document, create_theme } from "@nemu-ai/pdf";

const doc = new Document({ page_size: "A4", margin: 50, parse_markdown: true });

const theme = create_theme("report", {
  colors: { primary: "#1a365d", muted: "#718096", accent: "#3182ce" },
});
doc.set_theme(theme);

const page = doc.create_page(theme);

const header = page.header_container({ style: { padding_bottom: 12 } });
header.add(
  page.text({ content: "Q4 2025 Report", style: { font_size: 9, color: theme.get_color("muted") } }),
);

const footer = page.footer_container({ style: { padding_top: 10 } });
footer.add(
  page.text({ content: "Confidential", style: { font_size: 9, color: theme.get_color("muted"), text_align: "right" } }),
);

page.add(
  page.text({ content: "Revenue Summary", style: { font_size: 22, color: theme.get_color("primary") } }),
  page.text({
    content: "**Total revenue** for Q4 was *$128,400*, representing a ***14.3% increase*** year-over-year.",
    style: { padding_top: 8 },
  }),
);

const row = page.create_container({
  layout: { type: "flex", direction: "row", justify: "space-between", gap: 16 },
  style: { background_color: "#ebf8ff", padding: 16 },
  width: page.get_content_width(),
});
row.add(
  page.text({ content: "**Revenue**\n$128,400" }),
  page.text({ content: "**Growth**\n+14.3%" }),
  page.text({ content: "**Margin**\n38.2%" }),
);
page.add(row);

const table = page.table({
  columns: [180, 0, 100],
  border_width: 0.5,
  cell_padding: 8,
  header_style: { background_color: "#ebf4ff" },
  width: page.get_content_width(),
});
table.add_row(["Name", "Role", "Status"]);
table.add_row(["Alice Nguyen", "Lead Engineer", "Active"]);
table.add_row(["Bob Chen", "Designer", "Active"]);
page.add(table);

const card = page.rect({
  width: page.get_content_width(),
  height: 80,
  shape_style: { fill_color: "#276749", border_radius: 10 },
});
card.text({
  content: "**Key takeaway** - Q4 performance exceeded projections in all segments.",
  style: { color: "#ffffff", padding: 16 },
  z_index: 1,
});
page.add(card);

await doc.build("report.pdf");
```

---

## Type reference

```typescript
type PageSize = "A4" | "Letter" | "Legal";

interface PageDimensions {
  width: number;
  height: number;
}

interface DocumentOptions {
  page_size?: PageSize;
  custom_dimensions?: PageDimensions;
  margin?: number | MarginValues;
  parse_markdown?: boolean;
}

interface MarginValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface StyleProperties {
  font_family?: string;
  font_size?: number;
  font_weight?: string;
  font_style?: string;
  color?: string;
  background_color?: string;
  text_align?: string;
  line_height?: number;
  padding?: number;
  padding_top?: number;
  padding_right?: number;
  padding_bottom?: number;
  padding_left?: number;
}

interface ShapeStyle {
  fill_color?: string;
  stroke_color?: string;
  stroke_width?: number;
  border_radius?: number;
}

type LayoutMode = "flow" | "explicit";

interface MeasuredSize {
  width: number;
  height: number;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

type FlexDirection = "row" | "column";
type FlexJustify = "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly";
type FlexAlign = "flex-start" | "flex-end" | "center" | "stretch" | "baseline";

interface FlexLayoutOptions {
  type: "flex";
  direction: FlexDirection;
  justify?: FlexJustify;
  align?: FlexAlign;
  gap?: number;
}

interface FlowLayoutOptions {
  type: "flow";
  gap?: number;
}

type ContainerLayout = FlexLayoutOptions | FlowLayoutOptions;

interface CreateTextOptions {
  content: string;
  style?: StyleProperties;
  classname?: string;
  position?: VectorLike;
  width?: number;
  parse_markdown?: boolean;
  z_index?: number;
}

interface CreateRectOptions {
  style?: StyleProperties;
  shape_style?: ShapeStyle;
  position?: VectorLike;
  width?: number;
  height?: number;
  z_index?: number;
}

interface CreateImageOptions {
  name: string;
  position?: VectorLike;
  width?: number;
  height?: number;
  z_index?: number;
}

interface CreateContainerOptions {
  layout?: ContainerLayout;
  style?: StyleProperties;
  classname?: string;
  position?: VectorLike;
  width?: number;
  height?: number;
  z_index?: number;
}

interface TableCellInput {
  content: string;
  style?: StyleProperties;
}

interface CreateTableOptions {
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
```

---

## Vector

`Vector` is the spatial primitive used throughout the library for positions and sizes.

```typescript
import { Vector, vector } from "@nemu-ai/pdf";

const v = vector(100, 200);
v.x; // 100
v.y; // 200
v.copy(); // new Vector(100, 200)
```

`vector(x: number, y: number): Vector` is a convenience constructor equivalent to `new Vector(x, y)`.

Elements expose `get_position()` and `get_size()` after `build()`, both returning `Vector`.

```typescript
await doc.build("output.pdf");
console.log(element.get_position()); // Vector { x: 50, y: 82 }
console.log(element.get_bbox());     // { x: 50, y: 82, width: 300, height: 24 }
```

---

## Standard page sizes

| Name | Width (pt) | Height (pt) |
|---|---|---|
| A4 | 595.28 | 841.89 |
| Letter | 612 | 792 |
| Legal | 612 | 1008 |

Use `custom_dimensions` for any other size:

```typescript
const doc = new Document({
  custom_dimensions: { width: 400, height: 600 },
});
```
