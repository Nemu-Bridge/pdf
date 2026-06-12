import type {
  StyleProperties,
  DocumentOptions,
  MarginValues,
} from "../document/types";
import type { ChartKind, ChartData } from "./chart";

export type { ChartKind, ChartData, ChartSeries, ChartSlice } from "./chart";

export interface TableCell {
  text: InlineContent;
  align?: "left" | "center" | "right";
}

export type TableRow = Array<string | TableCell>;

export type Inline =
  | { type: "strong"; text: InlineContent }
  | { type: "em"; text: InlineContent }
  | { type: "strike"; text: InlineContent }
  | { type: "link"; text: InlineContent; href: string }
  | { type: "formula"; text: string }
  | { type: "code"; text: string };

export type InlineContent = string | Inline | Array<string | Inline>;

export type Block =
  | {
      type: "heading";
      text: InlineContent;
      level?: 1 | 2 | 3 | 4 | 5 | 6;
      style?: StyleProperties;
    }
  | { type: "paragraph"; text: InlineContent; style?: StyleProperties }
  | { type: "code"; text: string; language?: string; style?: StyleProperties }
  | { type: "formula"; text: string; style?: StyleProperties }
  | {
      type: "list";
      items: InlineContent[];
      ordered?: boolean;
      style?: StyleProperties;
    }
  | {
      type: "image";
      src: string;
      width?: number;
      height?: number;
      style?: StyleProperties;
    }
  | { type: "divider"; style?: StyleProperties }
  | { type: "spacer"; size?: number }
  | {
      type: "note";
      text: InlineContent;
      title?: InlineContent;
      variant?: "info" | "warn" | "success" | "muted";
      style?: StyleProperties;
    }
  | {
      type: "table";
      rows: TableRow[];
      headers?: TableRow;
      columns?: number | number[];
      style?: StyleProperties;
    }
  | {
      type: "chart";
      chart: ChartKind;
      data: ChartData;
      height?: number;
      title?: string;
      legend?: boolean;
      style?: StyleProperties;
    }
  | {
      type: "group";
      children: Block[];
      gap?: number;
      style?: StyleProperties;
    };

export type StyleRole =
  | "heading"
  | "paragraph"
  | "code"
  | "formula"
  | "list"
  | "link"
  | "group"
  | "divider"
  | "note"
  | "table"
  | "chart";

export type RoleStyles = Partial<Record<StyleRole, StyleProperties>>;

export interface PageContext {
  page_number: number;
  page_count: number;
  date: Date;
}

export interface DrawArea extends PageContext {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RawDraw {
  height: number;
  draw: (doc: any, area: DrawArea) => void;
}

export type HeaderFooter =
  | Block
  | Block[]
  | ((ctx: PageContext) => Block | Block[])
  | RawDraw;

export interface DocOptions extends DocumentOptions {
  padding?: number | MarginValues;
  header?: HeaderFooter;
  footer?: HeaderFooter;
  auto_paginate?: boolean;
}

export interface PageConfig {
  header?: HeaderFooter;
  footer?: HeaderFooter;
}
