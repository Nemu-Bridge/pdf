export { Document, Page } from "./document/document";
export { Theme, create_theme } from "./document/theme";
export { Vector, vector } from "./lib/vector";

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
