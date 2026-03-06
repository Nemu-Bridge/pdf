# @nemu-ai/pdf

A modern PDF generation library with vector-based positioning and theming support.

## Installation

```bash
bun add @nemu-ai/pdf
# or
npm install @nemu-ai/pdf
```

## Quick Start

```typescript
import { Document, Theme, create_theme, vector } from "@nemu-ai/pdf";

const pdf = new Document({
  page_size: "A4",
  margin: 50,
});

// Load custom fonts
await pdf.load_font("Satoshi", "./fonts/satoshi.ttf");

// Create theme
const theme = create_theme("custom", {
  colors: {
    primary: "#1a365d",
    text: "#1f2937",
    background: "#ffffff",
  },
});

pdf.set_theme(theme);

// Create page
const page = pdf.create_page(theme);

// Add text with vector position
page.text({
  content: "Hello World",
  position: vector(50, 100),
  style: {
    font_family: "Satoshi",
    font_size: 24,
    color: theme.get_color("primary"),
  },
});

// Draw shapes with vectors
page.rect(
  vector(50, 150),      // position
  vector(200, 100),     // size
  { fill_color: "#f8fafc" }
);

// Save PDF
await pdf.build("output.pdf");
```

## Complete API Reference

### Document

The main PDF document class.

```typescript
const doc = new Document(options?: DocumentOptions)
```

**DocumentOptions:**
```typescript
{
  page_size?: "A4" | "Letter" | "Legal" | "Custom"
  custom_dimensions?: { width: number; height: number }
  margin?: number | { top: number; right: number; bottom: number; left: number }
}
```

**Methods:**

#### `load_font(name: string, path: string): Promise<void>`
Load a custom TrueType font.
```typescript
await doc.load_font("Satoshi", "./fonts/satoshi.ttf");
await doc.load_font("Roboto", "./fonts/roboto.ttf");
```

#### `load_font_sync(name: string, path: string): void`
Synchronous version of load_font.
```typescript
doc.load_font_sync("Satoshi", "./fonts/satoshi.ttf");
```

#### `load_image(name: string, path: string): Promise<void>`
Load an image for later use.
```typescript
await doc.load_image("logo", "./images/logo.png");
await doc.load_image("photo", "./images/photo.jpg");
```

#### `set_theme(theme: Theme): void`
Set the default theme for all pages.
```typescript
const theme = create_theme("my-theme", { colors: { primary: "#000" } });
doc.set_theme(theme);
```

#### `create_page(theme?: Theme): Page`
Create a new page. Uses default theme if none provided.
```typescript
const page1 = doc.create_page();           // Uses default theme
const page2 = doc.create_page(customTheme); // Uses specific theme
```

#### `build(path: string): Promise<void>`
Save the PDF to a file.
```typescript
await doc.build("output.pdf");
await doc.build("./documents/report.pdf");
```

---

### Page

Represents a single page in the PDF.

#### `text(options: TextOptions): void`
Add text to the page.

**TextOptions:**
```typescript
{
  content: string                    // Required: text content
  position?: Vector                  // Optional: position vector
  style?: StyleProperties            // Optional: inline styles
  classname?: string                 // Optional: theme classname
  width?: number                     // Optional: max width for wrapping
}
```

**Examples:**
```typescript
// Simple text at cursor position
page.text({ content: "Hello World" });

// Text at specific position
page.text({
  content: "Title",
  position: vector(50, 100)
});

// Text with styling
page.text({
  content: "Styled Text",
  position: vector(50, 150),
  style: {
    font_family: "Satoshi",
    font_size: 24,
    color: "#1a365d",
    font_weight: "bold"
  }
});

// Text using classname from theme
page.text({
  content: "Body Text",
  position: vector(50, 200),
  classname: "body-text",
  width: 400  // Wraps text to 400px width
});
```

#### `header(options: HeaderOptions): void`
Add a header (same as text but with larger default font).

**HeaderOptions:**
```typescript
{
  text: string                       // Required: header text
  position?: Vector                  // Optional: position vector
  style?: StyleProperties            // Optional: inline styles
  classname?: string                 // Optional: theme classname
  width?: number                     // Optional: max width
}
```

**Examples:**
```typescript
page.header({ text: "Document Title" });

page.header({
  text: "Chapter 1",
  position: vector(50, 50),
  style: { font_size: 32, color: theme.get_color("primary") }
});
```

#### `rect(position: Vector, size: Vector, style?: ShapeStyle): void`
Draw a rectangle.

**Examples:**
```typescript
// Simple rectangle
page.rect(vector(50, 100), vector(200, 100));

// Filled rectangle
page.rect(
  vector(50, 100),
  vector(200, 100),
  { fill_color: "#f8fafc" }
);

// Bordered rectangle
page.rect(
  vector(50, 100),
  vector(200, 100),
  { 
    stroke_color: "#e2e8f0",
    stroke_width: 2
  }
);

// Rounded rectangle
page.rect(
  vector(50, 100),
  vector(200, 100),
  { 
    fill_color: "#f8fafc",
    border_radius: 10
  }
);

// Semi-transparent
page.rect(
  vector(50, 100),
  vector(200, 100),
  { 
    fill_color: "#000000",
    opacity: 0.1
  }
);
```

#### `image(options: ImageOptions): void`
Add an image.

**ImageOptions:**
```typescript
{
  name: string                       // Required: image name (from load_image)
  position?: Vector                  // Optional: position vector
  width?: number                     // Optional: width in pixels
  height?: number                    // Optional: height in pixels
}
```

**Examples:**
```typescript
await doc.load_image("logo", "./logo.png");

// Image at position
page.image({
  name: "logo",
  position: vector(50, 100),
  width: 200
});

// Image at cursor
page.image({ name: "logo", width: 150 });
```

#### `container(position?: Vector): Container`
Create a container for grouping elements.

**Examples:**
```typescript
// Container at position
const container = page.container(vector(50, 100));
container.rect(vector(0, 0), vector(200, 100));
container.text({ 
  content: "Inside container",
  position: vector(10, 10)
});

// Container at cursor
const container = page.container();
```

#### `move_down(amount: number = 1): void`
Move cursor down by amount (1 unit = line height).

**Examples:**
```typescript
page.move_down();      // Move 1 line
page.move_down(2);     // Move 2 lines
page.move_down(0.5);   // Move half line
```

#### Cursor Methods

```typescript
// Get cursor position
const cursor: Vector = page.get_cursor();
const x: number = page.get_cursor_x();
const y: number = page.get_cursor_y();

// Set cursor position
page.set_cursor(vector(100, 200));
page.set_cursor({ x: 100, y: 200 });
```

#### Dimension Methods

```typescript
const width: number = page.get_width();              // Page width
const height: number = page.get_height();            // Page height
const contentWidth: number = page.get_content_width();   // Width minus margins
const contentHeight: number = page.get_content_height(); // Height minus margins
const marginLeft: number = page.get_margin_left();
const marginRight: number = page.get_margin_right();
const marginTop: number = page.get_margin_top();
const marginBottom: number = page.get_margin_bottom();
```

#### Text Measurement

```typescript
const measurement = page.measure_text("Hello World", {
  font_size: 14,
  line_height: 1.5
});
// Returns: { width: number, height: number }
```

---

### Container

Groups elements with relative positioning.

#### `rect(position: Vector, size: Vector, style?: ShapeStyle): void`
Draw rectangle relative to container position.

```typescript
const container = page.container(vector(50, 50));
container.rect(vector(0, 0), vector(200, 100));      // At container origin
container.rect(vector(10, 10), vector(180, 80));     // Offset 10px
```

#### `text(options: TextOptions): void`
Add text relative to container position.

```typescript
const container = page.container(vector(50, 50));
container.text({
  content: "Title",
  position: vector(10, 10)  // 10px from container edge
});
```

#### `header(options: HeaderOptions): void`
Add header relative to container position.

```typescript
container.header({
  text: "Card Title",
  position: vector(10, 10)
});
```

#### `move_down(amount: number = 1): void`
Move cursor within container.

---

### Vector

2D vector for positioning.

#### Creation

```typescript
import { vector, Vector } from "@nemu-ai/pdf";

// From coordinates
const v1 = vector(100, 200);

// From object
const v2 = vector({ x: 100, y: 200 });
const v3 = new Vector(100, 200);
const v4 = new Vector({ x: 100, y: 200 });

// Copy
const v5 = v1.copy();

// Static factory methods
const zero = Vector.zero();      // (0, 0)
const one = Vector.one();        // (1, 1)
const up = Vector.up();          // (0, -1)
const down = Vector.down();      // (0, 1)
const left = Vector.left();      // (-1, 0)
const right = Vector.right();    // (1, 0)
```

#### Operations

```typescript
const a = vector(10, 20);
const b = vector(5, 5);

// Addition
const c = a.add(b);              // (15, 25)

// Subtraction
const d = a.subtract(b);         // (5, 15)

// Multiplication
const e = a.multiply(2);         // (20, 40)

// Division
const f = a.divide(2);           // (5, 10)

// Distance
const dist = a.dist_to(b);       // Distance between vectors

// Magnitude
const mag = a.magnitude();       // Vector length

// Normalization
const norm = a.normalize();      // Unit vector

// Rotation
const rotated = a.rotate(Math.PI / 2);  // Rotate 90 degrees

// Lerp (interpolation)
const between = a.lerp(b, 0.5);  // Halfway between a and b
```

#### Common Patterns

```typescript
// Center a rectangle
const pageCenter = vector(
  page.get_content_width() / 2,
  page.get_content_height() / 2
);
const boxSize = vector(200, 100);
const boxPos = pageCenter.subtract(boxSize.divide(2));
page.rect(boxPos, boxSize);

// Grid layout
const start = vector(50, 50);
const gap = vector(10, 10);
const itemSize = vector(100, 50);

for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 3; col++) {
    const pos = start.add(
      vector(col, row).multiply(itemSize.add(gap))
    );
    page.rect(pos, itemSize);
  }
}
```

---

### Theme

Centralized styling system.

#### `create_theme(name: string, definition: ThemeDefinition): Theme`

```typescript
const theme = create_theme("my-theme", {
  colors: {
    primary: "#1a365d",
    secondary: "#2563eb",
    accent: "#d97706",
    background: "#ffffff",
    text: "#1f2937",
    text_secondary: "#4b5563",
    border: "#e2e8f0",
    // Any custom colors
    brand_pink: "#ff69b4",
    custom_color: "#123456"
  },
  fonts: {
    heading: "Satoshi",
    body: "Helvetica",
    mono: "Courier"
  },
  spacing: {
    xs: 5,
    sm: 10,
    md: 20,
    lg: 30,
    xl: 50
  },
  border_radius: {
    sm: 5,
    md: 10,
    lg: 20
  }
});
```

#### `define_classname(name: string, style: StyleProperties): void`
#### `define_classname(definitions: Array<string | StyleProperties>): void`

```typescript
// Single definition
theme.define_classname("title", {
  font_family: "Satoshi",
  font_size: 32,
  color: theme.get_color("primary"),
  font_weight: "bold"
});

// Multiple definitions
theme.define_classname([
  "title", {
    font_family: "Satoshi",
    font_size: 32,
    color: theme.get_color("primary"),
    font_weight: "bold"
  },
  "subtitle", {
    font_family: "Satoshi",
    font_size: 24,
    color: theme.get_color("text_secondary")
  },
  "body", {
    font_family: "Helvetica",
    font_size: 14,
    color: theme.get_color("text"),
    line_height: 1.6
  },
  "caption", {
    font_family: "Helvetica",
    font_size: 12,
    color: theme.get_color("text_secondary"),
    font_style: "italic"
  }
]);
```

#### `get_color(key: string): string`

```typescript
const primary = theme.get_color("primary");
const custom = theme.get_color("brand_pink");
```

---

### StyleProperties

All style options available.

```typescript
interface StyleProperties {
  // Font
  font_family?: string
  font_size?: number
  font_weight?: "normal" | "bold" | number
  font_style?: "normal" | "italic" | "oblique"
  
  // Text
  color?: string
  text_align?: "left" | "center" | "right" | "justify"
  text_transform?: "none" | "capitalize" | "uppercase" | "lowercase"
  text_decoration?: "none" | "underline" | "line-through" | "overline"
  line_height?: number
  letter_spacing?: number
  
  // Spacing
  margin?: number | string
  margin_top?: number | string
  margin_right?: number | string
  margin_bottom?: number | string
  margin_left?: number | string
  padding?: number | string
  padding_top?: number | string
  padding_right?: number | string
  padding_bottom?: number | string
  padding_left?: number | string
  
  // Layout
  width?: number | string
  height?: number | string
  display?: "block" | "inline" | "none"
  position?: "static" | "relative" | "absolute"
  top?: number | string
  right?: number | string
  bottom?: number | string
  left?: number | string
  
  // Appearance
  background_color?: string
  border?: string
  opacity?: number
  
  // Advanced
  overflow?: "visible" | "hidden" | "scroll" | "auto"
  white_space?: "normal" | "nowrap" | "pre" | "pre-wrap" | "pre-line"
  word_break?: "normal" | "break-all" | "keep-all"
  text_overflow?: "clip" | "ellipsis"
  vertical_align?: "baseline" | "top" | "middle" | "bottom" | string
}
```

---

### ShapeStyle

Styling for shapes.

```typescript
interface ShapeStyle {
  fill_color?: string      // Fill color (hex)
  stroke_color?: string    // Border color (hex)
  stroke_width?: number    // Border width
  opacity?: number         // Opacity 0-1
  border_radius?: number   // Corner radius
}
```

## Complete Example

```typescript
import { Document, create_theme, vector } from "@nemu-ai/pdf";

const pdf = new Document({ page_size: "A4", margin: 50 });

const theme = create_theme("doc", {
  colors: {
    primary: "#1a365d",
    background: "#f8fafc",
    border: "#e2e8f0"
  }
});

pdf.set_theme(theme);
const page = pdf.create_page(theme);

// Header
page.header({
  text: "Document Title",
  position: vector(50, 50),
  style: { font_size: 24, color: theme.get_color("primary") }
});

// Card with content
const card_pos = vector(50, 100);
const card_size = vector(400, 200);

page.rect(card_pos, card_size, { 
  fill_color: theme.get_color("background"),
  stroke_color: theme.get_color("border"),
  stroke_width: 1
});

page.text({
  content: "Card content here",
  position: card_pos.add(vector(20, 20)),
  style: { font_size: 14 }
});

await pdf.build("output.pdf");
```

## License

MIT
