import type { StyleProperties } from "./types";

export interface ThemeDefinition {
  colors: Record<string, string>;
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  border_radius: {
    sm: number;
    md: number;
    lg: number;
  };
}

export interface ShapeStyle {
  fill_color?: string;
  stroke_color?: string;
  stroke_width?: number;
  opacity?: number;
  border_radius?: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export class Theme {
  name: string;
  definition: ThemeDefinition;
  private classnames: Map<string, StyleProperties>;

  constructor(name: string, definition: Partial<ThemeDefinition> = {}) {
    this.name = name;
    this.classnames = new Map();
    this.definition = {
      colors: {
        primary: definition.colors?.primary ?? "#4a90e2",
        secondary: definition.colors?.secondary ?? "#7bb3f0",
        accent: definition.colors?.accent ?? "#2c7dd6",
        background: definition.colors?.background ?? "#ffffff",
        text: definition.colors?.text ?? "#1a1a1a",
        text_secondary: definition.colors?.text_secondary ?? "#666666",
        border: definition.colors?.border ?? "#e0e0e0",
        muted: definition.colors?.muted ?? "#9ca3af",
        success: definition.colors?.success ?? "#22c55e",
        warning: definition.colors?.warning ?? "#f59e0b",
        error: definition.colors?.error ?? "#ef4444",
        info: definition.colors?.info ?? "#3b82f6",
        ...definition.colors,
      },
      fonts: {
        heading: "Helvetica-Bold",
        body: "Helvetica",
        mono: "Courier",
        ...definition.fonts,
      },
      spacing: {
        xs: 5,
        sm: 10,
        md: 20,
        lg: 30,
        xl: 50,
        ...definition.spacing,
      },
      border_radius: {
        sm: 5,
        md: 10,
        lg: 20,
        ...definition.border_radius,
      },
    };
  }

  define_classname(name: string, style: StyleProperties): void;
  define_classname(definitions: Array<string | StyleProperties>): void;
  define_classname(
    name_or_definitions: string | Array<string | StyleProperties>,
    style?: StyleProperties,
  ): void {
    if (typeof name_or_definitions === "string" && style) {
      this.classnames.set(name_or_definitions, style);
    } else if (Array.isArray(name_or_definitions)) {
      const definitions = name_or_definitions;
      for (let index = 0; index < definitions.length; index += 2) {
        const name = definitions[index];
        const class_style = definitions[index + 1];
        if (
          typeof name === "string" &&
          class_style &&
          typeof class_style === "object"
        ) {
          this.classnames.set(name, class_style as StyleProperties);
        }
      }
    }
  }

  get_classname(name: string): StyleProperties | undefined {
    return this.classnames.get(name);
  }

  has_classname(name: string): boolean {
    return this.classnames.has(name);
  }

  remove_classname(name: string): boolean {
    return this.classnames.delete(name);
  }

  clear_classnames(): void {
    this.classnames.clear();
  }

  merge_classname(
    base_style: StyleProperties,
    classname: string,
  ): StyleProperties {
    const class_style = this.classnames.get(classname);
    if (!class_style) {
      return base_style;
    }
    return { ...class_style, ...base_style };
  }

  get_color(key: string): string {
    const color = this.definition.colors[key];
    if (color === undefined) {
      throw new Error(`Color '${key}' not found in theme '${this.name}'`);
    }
    return color;
  }

  get_font(key: keyof ThemeDefinition["fonts"]): string {
    return this.definition.fonts[key];
  }

  get_spacing(key: keyof ThemeDefinition["spacing"]): number {
    return this.definition.spacing[key];
  }

  get_border_radius(key: keyof ThemeDefinition["border_radius"]): number {
    return this.definition.border_radius[key];
  }

  apply_to_style(
    base_style: StyleProperties,
    element_type: "heading" | "text" | "container" | "shape" = "text",
  ): StyleProperties {
    const themed_style: StyleProperties = { ...base_style };

    switch (element_type) {
      case "heading":
        if (!themed_style.color)
          themed_style.color = this.definition.colors.text;
        if (!themed_style.font_family)
          themed_style.font_family = this.definition.fonts.heading;
        break;
      case "text":
        if (!themed_style.color)
          themed_style.color = this.definition.colors.text_secondary;
        if (!themed_style.font_family)
          themed_style.font_family = this.definition.fonts.body;
        break;
      case "container":
        if (!themed_style.background_color)
          themed_style.background_color = this.definition.colors.background;
        if (!themed_style.border)
          themed_style.border = `1px solid ${this.definition.colors.border}`;
        break;
    }

    return themed_style;
  }
}

export const create_theme = (
  name: string,
  definition?: Partial<ThemeDefinition>,
): Theme => {
  return new Theme(name, definition);
};
