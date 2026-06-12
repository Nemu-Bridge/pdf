import { Doc, Color, type Block, type DrawArea } from "@nemu-ai/pdf";

const accent = Color({ hex: "#111827" });

const doc = new Doc({ page_size: "A4", margin: 54, padding: 10 });

doc.set_style({
  heading: { color: accent, font_family: "inter" },
  paragraph: { color: Color({ hex: "#1f2937" }), font_size: 11.5, line_height: 1.6 },
  link: { color: accent },
  formula: { font: "termes", font_size: 13 },
  table: { font_size: 10 },
});

doc.set_header({
  type: "paragraph",
  text: "Doc API Reference",
  style: { font_size: 9, color: "#9ca3af", padding_bottom: 12 },
});

doc.set_footer({
  height: 26,
  draw: (pdf: unknown, area: DrawArea) => {
    const d = pdf as {
      moveTo: (x: number, y: number) => typeof d;
      lineTo: (x: number, y: number) => typeof d;
      strokeColor: (c: string) => typeof d;
      lineWidth: (w: number) => typeof d;
      stroke: () => typeof d;
      font: (f: string) => typeof d;
      fontSize: (s: number) => typeof d;
      fillColor: (c: string) => typeof d;
      text: (t: string, x: number, y: number, o: object) => typeof d;
    };
    d.moveTo(area.x, area.y).lineTo(area.x + area.width, area.y).strokeColor("#e5e7eb").lineWidth(0.75).stroke();
    d.font("inter").fontSize(8).fillColor("#9ca3af");
    d.text(`Page ${area.page_number} of ${area.page_count}`, area.x, area.y + 8, { width: area.width, align: "right" });
    d.text(area.date.toLocaleDateString(), area.x, area.y + 8, { width: area.width, align: "left" });
  },
});

const section = (title: string, body: string, snippet: string): Block[] => [
  {
    type: "group",
    gap: 2,
    children: [
      { type: "heading", level: 2, text: title, style: { margin_top: 6 } },
      { type: "paragraph", text: body, style: { padding_bottom: 0 } },
    ],
  },
  { type: "code", language: "ts", text: snippet, style: { margin_top: 6 } },
];

const intro = doc.page();
intro.content(
  { type: "heading", level: 1, text: "Doc, a declarative PDF API" },
  {
    type: "paragraph",
    text: [
      "Doc describes a document as a list of typed blocks. You compose content with plain objects, set styles once, and call build. Inline runs mix ",
      { type: "strong", text: "bold" },
      ", ",
      { type: "em", text: "italic" },
      ", a ",
      { type: "link", text: "link", href: "https://nemu.cc" },
      ", inline code like ",
      { type: "code", text: "doc.page()" },
      ", and math like ",
      { type: "formula", text: "e^{i\\pi} + 1 = 0" },
      ".",
    ],
  },
  section(
    "Getting started",
    "Create a document, add a page, push blocks into content, then build to a file.",
    'import { Doc } from "@nemu-ai/pdf";\n\nconst doc = new Doc({ page_size: "A4", margin: 54 });\nconst page = doc.page();\npage.content(\n  { type: "heading", text: "Hello" },\n  { type: "paragraph", text: "First document." },\n);\nawait doc.build("out.pdf");',
  ),
  section(
    "Styling",
    "set_style assigns defaults per block role. Any block can override with its own style. Colors accept a string or a Color value.",
    'doc.set_style({\n  heading: { font_family: "inter" },\n  paragraph: { font_size: 12, line_height: 1.6 },\n  formula: { font: "termes", font_size: 13 },\n});',
  ),
  section(
    "Headings and lists",
    "Headings take a level from 1 to 6. Lists are ordered or unordered, and items accept inline content.",
    'page.content(\n  { type: "heading", level: 2, text: "Topics" },\n  { type: "list", ordered: true, items: ["First", "Second"] },\n);',
  ),
);

const rich = doc.page();
rich.content(
  { type: "heading", level: 1, text: "Text, code, and math" },
  section(
    "Code blocks",
    "Code blocks render on a tinted background in a monospace font. Inline code sits in the text flow.",
    'page.content({\n  type: "code",\n  language: "ts",\n  text: "const x = 1;",\n});',
  ),
  { type: "heading", level: 2, text: "Formulas" },
  {
    type: "paragraph",
    text: "Formulas render through MathJax. The math typeface is selectable with the font option, and you control the size.",
  },
  { type: "code", language: "ts", text: 'doc.set_style({ formula: { font: "termes", font_size: 13 } });\npage.content({ type: "formula", text: "x = \\\\frac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a}" });' },
  { type: "formula", text: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
  { type: "formula", text: "\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}" },
);

const components = doc.page();
components.content(
  { type: "heading", level: 1, text: "Components" },
  { type: "heading", level: 2, text: "Note" },
  {
    type: "paragraph",
    text: "A note draws a tinted callout with an optional title. Variants are info, warn, success, and muted.",
  },
  { type: "code", language: "ts", text: 'page.content({\n  type: "note",\n  variant: "info",\n  title: "Tip",\n  text: "Notes group a short message.",\n});' },
  { type: "note", variant: "info", title: "Tip", text: "Notes group a short message in a tinted box." },
  { type: "note", variant: "warn", title: "Careful", text: "Use warn for cautions." },
  { type: "heading", level: 2, text: "Table" },
  {
    type: "paragraph",
    text: "Tables take a header row and data rows. Cells are plain strings or objects with an alignment.",
  },
  { type: "code", language: "ts", text: 'page.content({\n  type: "table",\n  headers: ["Name", "Role", { text: "Score", align: "right" }],\n  rows: [["Alice", "Lead", { text: "98", align: "right" }]],\n});' },
  {
    type: "table",
    headers: ["Region", "Plan", { text: "Users", align: "right" }, { text: "Growth", align: "right" }],
    rows: [
      ["North", "Pro", { text: "1,284", align: "right" }, { text: "14%", align: "right" }],
      ["South", "Team", { text: "892", align: "right" }, { text: "9%", align: "right" }],
      ["West", "Pro", { text: "2,011", align: "right" }, { text: "23%", align: "right" }],
    ],
  },
);

const charts = doc.page();
const quarters = { labels: ["Q1", "Q2", "Q3", "Q4"], series: [{ name: "2024", values: [12, 19, 15, 22] }, { name: "2025", values: [18, 14, 25, 30] }] };
charts.content(
  { type: "heading", level: 1, text: "Charts" },
  {
    type: "paragraph",
    text: "Charts render as native PDF vectors. Supported kinds are bar, line, area, pie, and donut. Series and slices accept Color values.",
  },
  { type: "code", language: "ts", text: 'page.content({\n  type: "chart",\n  chart: "bar",\n  title: "Revenue",\n  data: { labels: ["Q1", "Q2"], series: [{ name: "2025", values: [18, 14] }] },\n});' },
  { type: "chart", chart: "bar", title: "Revenue by quarter", data: quarters, height: 190 },
  { type: "chart", chart: "line", title: "Trend", data: quarters, height: 180 },
  {
    type: "chart",
    chart: "donut",
    title: "Plan mix",
    data: { slices: [
      { label: "Pro", value: 52, color: accent },
      { label: "Team", value: 31, color: Color({ hex: "#6b7280" }) },
      { label: "Free", value: 17, color: Color({ hex: "#d1d5db" }) },
    ] },
    height: 170,
  },
);

const fonts = doc.page();
fonts.content(
  { type: "heading", level: 1, text: "Fonts and colors" },
  {
    type: "paragraph",
    text: "Six fonts ship with the package and register on load. Reference any by name. You can also load your own font file.",
  },
  { type: "code", language: "ts", text: 'doc.set_style({ paragraph: { font_family: "roboto" } });\ndoc.load_font("brand", "./fonts/brand.ttf");' },
  { type: "list", items: ["inter", "geist", "geist-mono", "nunito-sans", "roboto", "source-serif-4"] },
  { type: "heading", level: 2, text: "Color" },
  {
    type: "paragraph",
    text: "Color builds from one input and converts to any format. Pass a Color anywhere a color is accepted.",
  },
  { type: "code", language: "ts", text: 'import { Color } from "@nemu-ai/pdf";\n\nconst c = Color({ hex: "#3366cc" });\nc.to_rgb();      // rgb(51, 102, 204)\nc.to_hsl();      // hsl(220, 60%, 50%)\nc.darken(0.2);   // a darker Color\ndoc.set_style({ heading: { color: c } });' },
);

await doc.build("output.pdf");
