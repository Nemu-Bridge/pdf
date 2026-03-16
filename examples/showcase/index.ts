import { Document, create_theme } from "@nemu-ai/pdf";

const pdf = new Document({ page_size: "A4", margin: 50, parse_markdown: true });

const theme = create_theme("doc", {
  colors: {
    primary: "#0f0f0f",
    secondary: "#262626",
    accent: "#404040",
    muted: "#737373",
    success: "#1a1a1a",
    warning: "#525252",
  },
});
pdf.set_theme(theme);

const pw = pdf.page_width - 100;

const make_header = (
  page: ReturnType<typeof pdf.create_page>,
  label: string,
) => {
  const h = page.header_container({ style: { padding_bottom: 14 } });
  h.add(
    page.text({
      content: `@nemu-ai/pdf Library Showcase  |  ${label}`,
      style: { font_size: 9, color: theme.get_color("muted") },
    }),
  );
};

const make_footer = (page: ReturnType<typeof pdf.create_page>, n: string) => {
  const f = page.footer_container({ style: { padding_top: 10 } });
  f.add(
    page.text({
      content: `Page ${n} of 4`,
      style: {
        font_size: 9,
        color: theme.get_color("muted"),
        text_align: "right",
      },
    }),
  );
};

// ─── PAGE 1: Typography & Text Formatting ───────────────────────────────────

const p1 = pdf.create_page(theme);
make_header(p1, "Typography");
make_footer(p1, "1");

p1.add(
  p1.text({
    content: "Typography & Text Formatting",
    style: { font_size: 22, color: theme.get_color("primary") },
  }),
  p1.text({
    content: "Every text formatting option supported by the markdown parser.",
    style: {
      font_size: 12,
      color: theme.get_color("muted"),
      padding_top: 6,
      padding_bottom: 14,
    },
  }),

  p1.text({
    content: "Star markers",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_bottom: 4,
    },
  }),
  p1.text({ content: "Regular text, no formatting." }),
  p1.text({ content: "**Bold text** via double-stars." }),
  p1.text({ content: "*Italic text* via single-star." }),
  p1.text({ content: "***Bold and italic*** via triple-star." }),

  p1.text({
    content: "Underscore markers",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_top: 14,
      padding_bottom: 4,
    },
  }),
  p1.text({ content: "__Bold text__ via double-underscores." }),
  p1.text({ content: "_Italic text_ via single-underscore." }),
  p1.text({ content: "___Bold and italic___ via triple-underscore." }),

  p1.text({
    content: "Strikethrough",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_top: 14,
      padding_bottom: 4,
    },
  }),
  p1.text({ content: "~~This text is struck through~~ - deprecated value." }),

  p1.text({
    content: "Mixed inline",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_top: 14,
      padding_bottom: 4,
    },
  }),
  p1.text({
    content:
      "The **Q4 revenue** grew by *32%* year-over-year, with ***record margins*** in all segments. ~~Previous guidance~~ has been revised upward.",
  }),
  p1.text({
    content:
      "Use **bold** for key terms, _italics_ for titles, and ~~strikethrough~~ for retracted values.",
    style: { padding_top: 6 },
  }),
);

// ─── PAGE 2: LaTeX / Math Formulas ──────────────────────────────────────────

const p2 = pdf.create_page(theme);
make_header(p2, "LaTeX & Math");
make_footer(p2, "2");

p2.add(
  p2.text({
    content: "LaTeX & Math Formulas",
    style: { font_size: 22, color: theme.get_color("primary") },
  }),
  p2.text({
    content:
      "Formulas inside $...$ (inline) and $$...$$ (block) are parsed and converted to readable text. Greek letters and most math symbols require a Unicode font registered on the document; with standard built-in fonts only Latin-1 characters render correctly.",
    style: {
      font_size: 12,
      color: theme.get_color("muted"),
      padding_top: 6,
      padding_bottom: 14,
    },
  }),

  p2.text({
    content: "Superscripts (Latin-1 safe)",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_bottom: 4,
    },
  }),
  p2.text({ content: "Pythagorean theorem: $a^2 + b^2 = c^2$" }),
  p2.text({
    content: "Energy-mass equivalence: $E = mc^2$",
    style: { padding_top: 4 },
  }),
  p2.text({
    content: "Cube: $x^3 - y^3 = (x - y)(x^2 + xy + y^2)$",
    style: { padding_top: 4 },
  }),

  p2.text({
    content: "Operators (Latin-1 safe)",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_top: 14,
      padding_bottom: 4,
    },
  }),
  p2.text({
    content: "Arithmetic: $a \\times b$, $a \\div b$, $a \\pm b$, $a \\cdot b$",
  }),
  p2.text({ content: "Negation: $\\neg p$", style: { padding_top: 4 } }),

  p2.text({
    content: "Fractions and roots",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_top: 14,
      padding_bottom: 4,
    },
  }),
  p2.text({
    content: "Quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",
  }),
  p2.text({
    content: "Golden ratio: $\\phi = \\frac{1 + \\sqrt{5}}{2}$",
    style: { padding_top: 4 },
  }),

  p2.text({
    content: "Combined markdown and LaTeX",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_top: 14,
      padding_bottom: 4,
    },
  }),
  p2.text({
    content:
      "The **energy-mass equivalence** $E = mc^2$ is one of the most famous equations in physics. *Einstein* derived it from special relativity ($v \\leq c$).",
  }),
  p2.text({
    content:
      "A quadratic $ax^2 + bx + c = 0$ has discriminant $\\Delta = b^2 - 4ac$.",
    style: { padding_top: 6 },
  }),
);

// ─── PAGE 3: Layout Engine ───────────────────────────────────────────────────

const p3 = pdf.create_page(theme);
make_header(p3, "Layout Engine");
make_footer(p3, "3");

p3.add(
  p3.text({
    content: "Layout Engine",
    style: { font_size: 22, color: theme.get_color("primary") },
  }),
  p3.text({
    content:
      "Flow containers stack children vertically. Flex containers distribute children along a row or column with alignment and gap controls.",
    style: {
      font_size: 12,
      color: theme.get_color("muted"),
      padding_top: 6,
      padding_bottom: 14,
    },
  }),
);

p3.add(
  p3.text({
    content: "Flow layout (vertical stack, gap: 8)",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_bottom: 4,
    },
  }),
);
const flow_box = p3.create_container({
  layout: { type: "flow", gap: 8 },
  style: { background_color: "#f7fafc", padding: 12 },
  width: pw,
});
flow_box.add(
  p3.text({ content: "First item in the flow container." }),
  p3.text({ content: "Second item - stacked below with an 8pt gap." }),
  p3.text({
    content: "Third item - the gap is consistent between all children.",
  }),
);
p3.add(flow_box);

p3.add(
  p3.text({
    content: "Flex row - justify: space-between",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_top: 14,
      padding_bottom: 4,
    },
  }),
);
const row_sb = p3.create_container({
  layout: {
    type: "flex",
    direction: "row",
    justify: "space-between",
    align: "center",
  },
  style: { background_color: "#ebf8ff", padding: 12 },
  width: pw,
  height: 50,
});
row_sb.add(
  p3.text({
    content: "**Revenue**",
    style: { color: theme.get_color("primary") },
  }),
  p3.text({
    content: "$128,400",
    style: { color: theme.get_color("success") },
  }),
  p3.text({ content: "*+14.3%*", style: { color: theme.get_color("accent") } }),
);
p3.add(row_sb);

p3.add(
  p3.text({
    content: "Flex row - justify: space-evenly, align: center",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_top: 14,
      padding_bottom: 4,
    },
  }),
);
const row_se = p3.create_container({
  layout: {
    type: "flex",
    direction: "row",
    justify: "space-evenly",
    align: "center",
  },
  style: { background_color: "#fefcbf", padding: 12 },
  width: pw,
  height: 50,
});
row_se.add(
  p3.text({ content: "Q1", style: { font_size: 14 } }),
  p3.text({ content: "Q2", style: { font_size: 14 } }),
  p3.text({ content: "Q3", style: { font_size: 14 } }),
  p3.text({ content: "Q4", style: { font_size: 14 } }),
);
p3.add(row_se);

p3.add(
  p3.text({
    content: "Nested containers (flow inside flex-row)",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_top: 14,
      padding_bottom: 4,
    },
  }),
);
const outer_row = p3.create_container({
  layout: { type: "flex", direction: "row", justify: "space-between", gap: 12 },
  width: pw,
});
const col_w = (pw - 12) / 2;
const left_col = p3.create_container({
  layout: { type: "flow", gap: 4 },
  style: { background_color: "#e6fffa", padding: 10 },
  width: col_w,
});
left_col.add(
  p3.text({ content: "**Left column**", style: { font_size: 13 } }),
  p3.text({
    content: "Flow layout inside a flex cell.",
    style: { color: theme.get_color("muted") },
  }),
  p3.text({
    content: "Third line of text here.",
    style: { color: theme.get_color("muted") },
  }),
);
const right_col = p3.create_container({
  layout: { type: "flow", gap: 4 },
  style: { background_color: "#fff5f5", padding: 10 },
  width: col_w,
});
right_col.add(
  p3.text({ content: "**Right column**", style: { font_size: 13 } }),
  p3.text({
    content: "Also flow layout.",
    style: { color: theme.get_color("muted") },
  }),
  p3.text({
    content: "Independent sizing.",
    style: { color: theme.get_color("muted") },
  }),
);
outer_row.add(left_col, right_col);
p3.add(outer_row);

p3.add(
  p3.text({
    content: "Table",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_top: 14,
      padding_bottom: 4,
    },
  }),
);
const table = p3.table({
  columns: [180, 0, 100],
  border_color: "#cbd5e0",
  border_width: 0.5,
  cell_padding: 8,
  header_style: { background_color: "#ebf4ff", font_size: 11 },
  cell_style: { font_size: 11 },
  width: pw,
});
table.add_row(["Name", "Role", "Status"]);
table.add_row(["Alice Nguyen", "Lead Engineer", "Active"]);
table.add_row(["Bob Chen", "Designer", "Active"]);
table.add_row(["Carol Smith", "Product Manager", "On leave"]);
table.add_row([
  { content: "Dave Kim", style: { color: "#718096" } },
  "Data Scientist",
  { content: "Inactive", style: { color: "#c53030" } },
]);
p3.add(table);

// ─── PAGE 4: Z-Index, Parent-Child, Explicit Position ───────────────────────

const p4 = pdf.create_page(theme);
make_header(p4, "Z-Index & Layering");
make_footer(p4, "4");

p4.add(
  p4.text({
    content: "Z-Index, Parent-Child & Explicit Positioning",
    style: { font_size: 22, color: theme.get_color("primary") },
  }),
  p4.text({
    content:
      "Elements own child elements rendered on top of them, positioned relative to the parent's top-left corner. Z-index controls draw order within the same parent.",
    style: {
      font_size: 12,
      color: theme.get_color("muted"),
      padding_top: 6,
      padding_bottom: 14,
    },
  }),
);

// Rect with padded text child
p4.add(
  p4.text({
    content: "Rect with text child (padding: 12)",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_bottom: 4,
    },
  }),
);
const card1 = p4.rect({
  width: pw,
  height: 60,
  shape_style: { fill_color: "#2b6cb0", border_radius: 8 },
  z_index: 0,
});
card1.text({
  content:
    "This text is a child of the rect - rendered on top, padded by 12pt.",
  z_index: 1,
  style: { color: "#ffffff", font_size: 12, padding: 12 },
});
p4.add(card1);

// Z-index layering - inside a container so positions are relative
p4.add(
  p4.text({
    content:
      "Z-index layering - draw order is z=0, z=1, z=2 regardless of declaration order",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_top: 14,
      padding_bottom: 4,
    },
  }),
);
const layer_box = p4.create_container({ width: pw, height: 80 });
const base_rect = p4.rect({
  width: pw,
  height: 80,
  shape_style: { fill_color: "#1a365d" },
  z_index: 0,
});
const top_rect = p4.rect({
  width: pw - 80,
  height: 40,
  shape_style: { fill_color: "#63b3ed" },
  position: { x: 40, y: 20 },
  z_index: 1,
});
const mid_rect = p4.rect({
  width: pw - 40,
  height: 60,
  shape_style: { fill_color: "#3182ce" },
  position: { x: 20, y: 10 },
  z_index: 2,
});
layer_box.add(base_rect, mid_rect, top_rect);
p4.add(layer_box);

// Multi-layer card: background, title, subtitle, badge all as children of one rect
p4.add(
  p4.text({
    content:
      "Multi-layer card - title, subtitle, and badge are children of the background rect",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_top: 14,
      padding_bottom: 4,
    },
  }),
);
const card2 = p4.rect({
  width: pw,
  height: 100,
  shape_style: { fill_color: "#276749", border_radius: 10 },
  z_index: 0,
});
card2.text({
  content: "**Q4 2025 Report**",
  z_index: 1,
  style: { color: "#ffffff", font_size: 16, padding_left: 16, padding_top: 16 },
});
card2.text({
  content: "Revenue exceeded projections by $\\Delta = 14.3\\%$.",
  z_index: 1,
  style: { color: "#c6f6d5", font_size: 11, padding_left: 16, padding_top: 48 },
});
const badge = card2.rect({
  width: 80,
  height: 24,
  shape_style: { fill_color: "#f6e05e", border_radius: 12 },
  position: { x: pw - 96, y: 38 },
  z_index: 2,
});
badge.text({
  content: "VERIFIED",
  z_index: 3,
  style: { font_size: 8, color: "#744210", padding_top: 7, padding_left: 14 },
});
p4.add(card2);

// Absolute positioning within a parent rect
p4.add(
  p4.text({
    content: "Absolute positioning within a parent (corner labels)",
    style: {
      font_size: 14,
      color: theme.get_color("secondary"),
      padding_top: 14,
      padding_bottom: 4,
    },
  }),
);
const abs_box = p4.rect({
  width: pw,
  height: 80,
  shape_style: { fill_color: "#faf5ff" },
  z_index: 0,
});
abs_box.text({
  content: "TOP LEFT",
  position: { x: 8, y: 8 },
  z_index: 1,
  style: { font_size: 9, color: theme.get_color("muted") },
});
abs_box.text({
  content: "TOP RIGHT",
  position: { x: pw - 70, y: 8 },
  z_index: 1,
  style: { font_size: 9, color: theme.get_color("muted") },
});
abs_box.text({
  content: "BOTTOM LEFT",
  position: { x: 8, y: 60 },
  z_index: 1,
  style: { font_size: 9, color: theme.get_color("muted") },
});
abs_box.text({
  content: "BOTTOM RIGHT",
  position: { x: pw - 84, y: 60 },
  z_index: 1,
  style: { font_size: 9, color: theme.get_color("muted") },
});
abs_box.text({
  content: "CENTER",
  position: { x: pw / 2 - 20, y: 34 },
  z_index: 1,
  style: { font_size: 11, color: theme.get_color("primary") },
});
p4.add(abs_box);

await pdf.build("output.pdf");
