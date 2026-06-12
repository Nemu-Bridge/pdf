import { parse_inline_markdown, type MarkdownSegment } from "../document/markdown";
import type { Inline, InlineContent } from "./types";

export const to_inline_array = (
  content: InlineContent,
): Array<string | Inline> => (Array.isArray(content) ? content : [content]);

export const has_structured = (content: InlineContent): boolean =>
  to_inline_array(content).some((n) => typeof n === "object");

export const inline_to_plain = (node: string | Inline): string => {
  if (typeof node === "string") return node;
  if (node.type === "formula" || node.type === "code") return node.text;
  return to_inline_array(node.text).map(inline_to_plain).join("");
};

export interface SegmentOptions {
  link_color: string;
  code_color: string;
  code_font: string;
  markdown: boolean;
}

const plain_segment = (text: string): MarkdownSegment => ({
  text,
  bold: false,
  italic: false,
  strikethrough: false,
});

const with_flags = (
  segments: MarkdownSegment[],
  flags: { bold?: boolean; italic?: boolean; strike?: boolean },
): MarkdownSegment[] =>
  segments.map((s) => ({
    ...s,
    bold: s.bold || !!flags.bold,
    italic: s.italic || !!flags.italic,
    strikethrough: s.strikethrough || !!flags.strike,
  }));

const node_to_segments = (
  node: string | Inline,
  opts: SegmentOptions,
): MarkdownSegment[] => {
  if (typeof node === "string") {
    return opts.markdown ? parse_inline_markdown(node) : [plain_segment(node)];
  }
  switch (node.type) {
    case "strong":
      return with_flags(to_segments(node.text, opts), { bold: true });
    case "em":
      return with_flags(to_segments(node.text, opts), { italic: true });
    case "strike":
      return with_flags(to_segments(node.text, opts), { strike: true });
    case "formula":
      return parse_inline_markdown(`$${node.text}$`);
    case "link":
      return to_segments(node.text, opts).map((s) => ({
        ...s,
        link: node.href,
        color: opts.link_color,
        underline: true,
      }));
    case "code":
      return [
        { ...plain_segment(node.text), font: opts.code_font, color: opts.code_color },
      ];
    default:
      return [];
  }
};

export const to_segments = (
  content: InlineContent,
  opts: SegmentOptions,
): MarkdownSegment[] =>
  to_inline_array(content).flatMap((node) => node_to_segments(node, opts));
