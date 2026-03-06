export const PAGE_DIMENSIONS: Record<
  string,
  { width: number; height: number }
> = {
  A4: { width: 595.28, height: 841.89 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
};

export const DEFAULT_MARGIN = 72;
export const DEFAULT_FONT_SIZE = 12;
export const DEFAULT_LINE_HEIGHT = 1.2;
export const DEFAULT_FONT_FAMILY = "Helvetica";

export const PDF_VERSION = "1.4";
export const PDF_CREATOR = "PDF Generator";

export const STANDARD_FONTS = [
  "Helvetica",
  "Helvetica-Bold",
  "Helvetica-Oblique",
  "Helvetica-BoldOblique",
  "Times-Roman",
  "Times-Bold",
  "Times-Italic",
  "Times-BoldItalic",
  "Courier",
  "Courier-Bold",
  "Courier-Oblique",
  "Courier-BoldOblique",
];
