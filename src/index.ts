export { Document, Page } from "./document/document";
export { Doc, DocPage } from "./doc/doc";
export {
  available_formula_fonts,
  default_formula_font,
} from "./doc/mathjax";
export { FormulaElement } from "./doc/formula";
export { Theme, create_theme } from "./document/theme";
export { Vector, vector } from "./lib/vector";
export { Color } from "./lib/color";

export {
  BaseElement,
  TextElement,
  RectElement,
  ImageElement,
  ContainerElement,
  TableElement,
  HeaderContainer,
  FooterContainer,
} from "./document/elements";

export type {
  PageSize,
  PageDimensions,
  DocumentOptions,
  MarginValues,
  StyleProperties,
  ElementBounds,
  BoundingBox,
  LayoutMode,
  MeasuredSize,
  ContainerLayout,
  FlexLayoutOptions,
  FlowLayoutOptions,
  FlexDirection,
  FlexJustify,
  FlexAlign,
  IDocument,
} from "./document/types";

export type {
  CreateContainerOptions,
  CreateTextOptions,
  CreateRectOptions,
  CreateImageOptions,
  CreateTableOptions,
  TableCellInput,
} from "./document/elements";

export type { VectorLike } from "./lib/vector";
export type { ShapeStyle } from "./document/theme";
export type { ColorInput, ColorValue, Rgba } from "./lib/color";
export type { ColorLike } from "./document/types";

export type {
  Block,
  Inline,
  InlineContent,
  DocOptions,
  RoleStyles,
  StyleRole,
  PageConfig,
  PageContext,
  HeaderFooter,
  RawDraw,
  DrawArea,
  TableCell,
  TableRow,
  ChartKind,
  ChartData,
  ChartSeries,
  ChartSlice,
} from "./doc/types";
