import type { ReactNode, CSSProperties, MouseEvent } from "react";

export type CardElevation = "none" | "sm" | "md" | "lg";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps {
  children: ReactNode;
  elevation?: CardElevation;
  padding?: CardPadding;
  className?: string;
  style?: CSSProperties;
  id?: string;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  ariaLabel?: string;
  role?: "region" | "article" | "button";
}

const elevationShadowMap: Record<CardElevation, string> = {
  none: "none",
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
};

const elevationHoverShadowMap: Record<CardElevation, string> = {
  none: "none",
  sm: "var(--shadow-md)",
  md: "var(--shadow-lg)",
  lg: "var(--shadow-xl)",
};

const paddingMap: Record<CardPadding, string> = {
  none: "0",
  sm: "var(--space-3)",
  md: "var(--space-4)",
  lg: "var(--space-6)",
};

export function Card({
  children,
  elevation = "sm",
  padding = "md",
  className = "",
  style,
  id,
  onClick,
  ariaLabel,
  role = "region",
}: CardProps) {
  const isClickable = !!onClick;

  const baseStyles: CSSProperties = {
    backgroundColor: "var(--color-surface)",
    borderRadius: "var(--radius-lg)",
    boxShadow: elevationShadowMap[elevation],
    padding: paddingMap[padding],
    transition: "box-shadow var(--motion-state-ms) ease",
    cursor: isClickable ? "pointer" : "default",
    ...style,
  };

  return (
    <div
      id={id}
      className={className}
      style={baseStyles}
      onClick={onClick}
      role={isClickable ? "button" : role}
      aria-label={ariaLabel}
      onMouseEnter={(e) => {
        if (elevation !== "none") {
          e.currentTarget.style.boxShadow = elevationHoverShadowMap[elevation];
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = elevationShadowMap[elevation];
      }}
      onFocus={(e) => {
        if (isClickable) {
          e.currentTarget.style.outline = "2px solid var(--color-info)";
          e.currentTarget.style.outlineOffset = "2px";
        }
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = "none";
        e.currentTarget.style.outlineOffset = "0";
      }}
    >
      {children}
    </div>
  );
}
