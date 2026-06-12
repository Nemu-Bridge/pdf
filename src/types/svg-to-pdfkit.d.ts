declare module "svg-to-pdfkit" {
  interface svg_to_pdf_options {
    width?: number;
    height?: number;
    assumePt?: boolean;
    preserveAspectRatio?: string;
  }
  export default function SVGtoPDF(
    doc: unknown,
    svg: string,
    x?: number,
    y?: number,
    options?: svg_to_pdf_options,
  ): void;
}
