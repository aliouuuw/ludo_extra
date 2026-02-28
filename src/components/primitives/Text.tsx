import type { ReactNode, CSSProperties } from "react";

export type TextVariant =
  | "caption"
  | "sm"
  | "base"
  | "h4"
  | "h3"
  | "h2"
  | "h1"
  | "display";

export type TextElement =
  | "span"
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "label"
  | "div";

export interface TextProps {
  children: ReactNode;
  variant?: TextVariant;
  as?: TextElement;
  color?: "default" | "muted" | "primary" | "error" | "success" | "warning";
  align?: "left" | "center" | "right";
  truncate?: boolean;
  className?: string;
  style?: CSSProperties;
  id?: string;
  htmlFor?: string;
}

const variantSizeMap: Record<TextVariant, string> = {
  caption: "var(--text-caption)",
  sm: "var(--text-sm)",
  base: "var(--text-base)",
  h4: "var(--text-h4)",
  h3: "var(--text-h3)",
  h2: "var(--text-h2)",
  h1: "var(--text-h1)",
  display: "var(--text-display)",
};

const variantWeightMap: Record<TextVariant, number> = {
  caption: 400,
  sm: 400,
  base: 400,
  h4: 600,
  h3: 600,
  h2: 600,
  h1: 700,
  display: 700,
};

const variantLineHeightMap: Record<TextVariant, number> = {
  caption: 1.5,
  sm: 1.5,
  base: 1.5,
  h4: 1.2,
  h3: 1.2,
  h2: 1.2,
  h1: 1.2,
  display: 1.2,
};

const colorMap: Record<NonNullable<TextProps["color"]>, string> = {
  default: "var(--color-neutral-900)",
  muted: "var(--color-neutral-500)",
  primary: "var(--color-primary)",
  error: "var(--color-error)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
};

export function Text({
  children,
  variant = "base",
  as: Component = "span",
  color = "default",
  align = "left",
  truncate = false,
  className = "",
  style,
  id,
  htmlFor,
}: TextProps) {
  const computedStyle: CSSProperties = {
    fontSize: variantSizeMap[variant],
    fontWeight: variantWeightMap[variant],
    lineHeight: variantLineHeightMap[variant],
    color: colorMap[color],
    textAlign: align,
    margin: 0,
    ...(truncate && {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }),
    ...style,
  };

  const props: Record<string, unknown> = {
    className,
    style: computedStyle,
  };

  if (id) props.id = id;
  if (htmlFor && Component === "label") props.htmlFor = htmlFor;

  return <Component {...props}>{children}</Component>;
}
