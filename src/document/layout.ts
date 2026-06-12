import type { IDocument } from "./types";
import {
  BaseElement,
  ContainerElement,
  HeaderContainer,
  FooterContainer,
} from "./elements";
import { Vector } from "../lib/vector";

interface PageRef {
  header: HeaderContainer | null;
  footer: FooterContainer | null;
  root_elements: BaseElement[];
  get_content_width(): number;
  get_content_height(): number;
}

export class LayoutEngine {
  private document: IDocument;
  private pdoc: any;

  constructor(document: IDocument, pdoc: any) {
    this.document = document;
    this.pdoc = pdoc;
  }

  run(page: PageRef): void {
    this.wire_document(page);
    this.measure_pass(page);
    this.layout_pass(page);
    this.render_pass(page);
  }

  private wire_document(page: PageRef): void {
    const wire = (el: BaseElement) => {
      el._document = this.document;
    };
    if (page.header) wire(page.header);
    if (page.footer) wire(page.footer);
    for (const el of page.root_elements) wire(el);
  }

  private measure_pass(page: PageRef): void {
    const content_width = page.get_content_width();
    if (page.header) page.header.measure(content_width);
    if (page.footer) page.footer.measure(content_width);
    for (const el of page.root_elements) {
      el._document = this.document;
      el.measure(content_width);
    }
  }

  private layout_pass(page: PageRef): void {
    const margin = this.document.margin;
    const content_width = page.get_content_width();
    const content_height = page.get_content_height();

    let header_height = 0;
    if (page.header) {
      const h = page.header;
      h.computed_position = new Vector(margin.left, margin.top);
      h.computed_size = new Vector(content_width, h.zone_height);
      h.layout_children(h.computed_position, content_width);
      header_height = h.zone_height;
    }

    if (page.footer) {
      const f = page.footer;
      const footer_y = margin.top + content_height - f.zone_height;
      f.computed_position = new Vector(margin.left, footer_y);
      f.computed_size = new Vector(content_width, f.zone_height);
      f.layout_children(f.computed_position, content_width);
    }

    const content_origin = new Vector(margin.left, margin.top + header_height);
    let cursor_y = content_origin.y;

    for (const el of page.root_elements) {
      if (el.layout_mode === "explicit") {
        const explicit_pos = (el as any).options?.position as
          | { x: number; y: number }
          | undefined;
        const ox = explicit_pos ? explicit_pos.x : 0;
        const oy = explicit_pos ? explicit_pos.y : 0;
        el.computed_position = new Vector(
          content_origin.x + ox,
          content_origin.y + oy,
        );
      } else {
        el.computed_position = new Vector(content_origin.x, cursor_y);
        cursor_y += el.measured_size!.height;
      }
      el.computed_size = new Vector(
        el.measured_size!.width,
        el.measured_size!.height,
      );
      if (el instanceof ContainerElement) {
        el.layout_children(el.computed_position, content_width);
      }
    }
  }

  private render_pass(page: PageRef): void {
    if (page.header) page.header.render(this.pdoc);
    const sorted = [...page.root_elements].sort(
      (a, b) => a.z_index - b.z_index,
    );
    for (const el of sorted) el.render(this.pdoc);
    if (page.footer) page.footer.render(this.pdoc);
  }
}
