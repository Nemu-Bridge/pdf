import { BaseElement } from "../document/elements";
import type {
  StyleProperties,
  MeasuredSize,
  ColorLike,
} from "../document/types";
import { compute_padding } from "../document/render_helpers";
import { color_css } from "../document/style";

export type ChartKind = "bar" | "line" | "area" | "pie" | "donut";

export interface ChartSeries {
  name?: string;
  values: number[];
  color?: ColorLike;
}

export interface ChartSlice {
  label: string;
  value: number;
  color?: ColorLike;
}

export interface ChartData {
  labels?: string[];
  series?: ChartSeries[];
  slices?: ChartSlice[];
}

const palette = [
  "#111827",
  "#6b7280",
  "#9ca3af",
  "#374151",
  "#d1d5db",
  "#4b5563",
];

const axis_color = "#e5e7eb";
const label_color = "#6b7280";

const at = (index: number): string => palette[index % palette.length]!;

const nice_max = (value: number): number => {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const norm = value / pow;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * pow;
};

export class ChartElement extends BaseElement {
  private kind: ChartKind;
  private data: ChartData;
  private style: StyleProperties;
  private title: string | undefined;
  private legend: boolean;
  private box_width: number;
  private box_height: number;

  constructor(
    kind: ChartKind,
    data: ChartData,
    style: StyleProperties,
    height: number | undefined,
    title: string | undefined,
    legend: boolean,
  ) {
    super("flow");
    this.kind = kind;
    this.data = data;
    this.style = style;
    this.title = title;
    this.legend = legend;
    this.box_width = 0;
    this.box_height = height ?? 220;
  }

  private font(): string {
    return this.style.font_family ?? "Helvetica";
  }

  measure(avail_width: number): MeasuredSize {
    const padding = compute_padding(this.style);
    this.box_width = this.style.width
      ? Number(this.style.width)
      : avail_width;
    this.measured_size = {
      width: this.box_width,
      height: this.box_height + padding.top + padding.bottom,
    };
    return this.measured_size;
  }

  render(pdoc: any): void {
    const pos = this.computed_position!;
    const padding = compute_padding(this.style);
    const x = pos.x + padding.left;
    let y = pos.y + padding.top;
    const w = this.box_width - padding.left - padding.right;
    let h = this.box_height;

    if (this.title) {
      pdoc
        .font(this.font())
        .fontSize(11)
        .fillColor(color_css(this.style.color) ?? "#111827")
        .text(this.title, x, y, { width: w });
      y += 20;
      h -= 20;
    }

    if (this.kind === "pie" || this.kind === "donut") {
      this.draw_pie(pdoc, x, y, w, h);
      return;
    }
    this.draw_axes_chart(pdoc, x, y, w, h);
  }

  private draw_axes_chart(
    pdoc: any,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const series = this.data.series ?? [];
    const labels = this.data.labels ?? [];
    const pad_left = 40;
    const pad_bottom = 22;
    const plot_x = x + pad_left;
    const plot_y = y;
    const plot_w = w - pad_left;
    const plot_h = h - pad_bottom;
    const all_values = series.flatMap((s) => s.values);
    const max = nice_max(Math.max(0, ...all_values));

    const value_y = (value: number): number =>
      plot_y + plot_h - (value / max) * plot_h;

    pdoc.lineWidth(0.75).strokeColor(axis_color);
    const ticks = 4;
    pdoc.font(this.font()).fontSize(8).fillColor(label_color);
    for (let i = 0; i <= ticks; i++) {
      const ty = plot_y + (plot_h * i) / ticks;
      pdoc.moveTo(plot_x, ty).lineTo(plot_x + plot_w, ty).stroke();
      const value = Math.round((max * (ticks - i)) / ticks);
      pdoc.text(String(value), x, ty - 4, {
        width: pad_left - 6,
        align: "right",
      });
    }

    const count = labels.length || (series[0]?.values.length ?? 0);
    const slot = count > 0 ? plot_w / count : plot_w;

    if (this.kind === "bar") {
      const group_pad = slot * 0.2;
      const bar_w = (slot - group_pad) / Math.max(1, series.length);
      series.forEach((s, si) => {
        pdoc.fillColor(color_css(s.color) ?? at(si));
        s.values.forEach((value, vi) => {
          const bx = plot_x + vi * slot + group_pad / 2 + si * bar_w;
          const by = value_y(value);
          pdoc.rect(bx, by, bar_w - 1, plot_y + plot_h - by).fill();
        });
      });
    } else {
      series.forEach((s, si) => {
        const css = color_css(s.color) ?? at(si);
        const points = s.values.map((value, vi) => ({
          px: plot_x + vi * slot + slot / 2,
          py: value_y(value),
        }));
        if (this.kind === "area") {
          const base = plot_y + plot_h;
          let d = `M ${points[0]?.px ?? plot_x} ${base}`;
          points.forEach((p) => (d += ` L ${p.px} ${p.py}`));
          d += ` L ${points[points.length - 1]?.px ?? plot_x} ${base} Z`;
          pdoc.path(d).fillOpacity(0.18).fill(css).fillOpacity(1);
        }
        pdoc.lineWidth(1.5).strokeColor(css);
        points.forEach((p, i) =>
          i === 0
            ? pdoc.moveTo(p.px, p.py)
            : pdoc.lineTo(p.px, p.py),
        );
        pdoc.stroke();
      });
    }

    pdoc.font(this.font()).fontSize(8).fillColor(label_color);
    labels.forEach((label, i) => {
      pdoc.text(label, plot_x + i * slot, plot_y + plot_h + 6, {
        width: slot,
        align: "center",
      });
    });

    this.draw_series_legend(pdoc, x, plot_y + plot_h + pad_bottom - 2, w);
  }

  private draw_series_legend(
    pdoc: any,
    x: number,
    y: number,
    w: number,
  ): void {
    if (!this.legend) return;
    const series = (this.data.series ?? []).filter((s) => s.name);
    if (series.length === 0) return;
    let cx = x;
    pdoc.font(this.font()).fontSize(8);
    series.forEach((s, si) => {
      pdoc.fillColor(color_css(s.color) ?? at(si)).rect(cx, y, 8, 8).fill();
      pdoc.fillColor(label_color).text(s.name ?? "", cx + 11, y, {
        width: w,
        lineBreak: false,
      });
      cx += 11 + pdoc.widthOfString(s.name ?? "") + 16;
    });
  }

  private draw_pie(
    pdoc: any,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const slices = this.data.slices ?? [];
    const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
    const radius = Math.min(w * 0.5, h) / 2 - 4;
    const cx = x + radius + 4;
    const cy = y + h / 2;
    let angle = -Math.PI / 2;

    slices.forEach((s, si) => {
      const sweep = (s.value / total) * Math.PI * 2;
      const end = angle + sweep;
      const x0 = cx + radius * Math.cos(angle);
      const y0 = cy + radius * Math.sin(angle);
      const x1 = cx + radius * Math.cos(end);
      const y1 = cy + radius * Math.sin(end);
      const large = sweep > Math.PI ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1} Z`;
      pdoc.path(d).fill(color_css(s.color) ?? at(si));
      angle = end;
    });

    if (this.kind === "donut") {
      pdoc
        .circle(cx, cy, radius * 0.55)
        .fill(color_css(this.style.background_color) ?? "#ffffff");
    }

    const legend_x = cx + radius + 20;
    let ly = cy - (slices.length * 14) / 2;
    pdoc.font(this.font()).fontSize(8);
    slices.forEach((s, si) => {
      pdoc.fillColor(color_css(s.color) ?? at(si)).rect(legend_x, ly, 8, 8).fill();
      const pct = Math.round((s.value / total) * 100);
      pdoc
        .fillColor(label_color)
        .text(`${s.label}  ${pct}%`, legend_x + 11, ly, { lineBreak: false });
      ly += 14;
    });
  }
}
