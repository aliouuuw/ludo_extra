import type { ReactNode, CSSProperties, MouseEvent, KeyboardEvent } from "react";
import { Text } from "./Text";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  style?: CSSProperties;
  id?: string;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaControls?: string;
  ariaHasPopup?: boolean | "dialog" | "menu" | "listbox" | "tree" | "grid";
}

const sizePaddingMap: Record<ButtonSize, { block: string; inline: string }> = {
  sm: { block: "var(--space-1)", inline: "var(--space-3)" },
  md: { block: "var(--space-2)", inline: "var(--space-4)" },
  lg: { block: "var(--space-3)", inline: "var(--space-6)" },
};

const sizeFontSizeMap: Record<ButtonSize, string> = {
  sm: "var(--text-sm)",
  md: "var(--text-base)",
  lg: "var(--text-h4)",
};

const variantStyles: Record<ButtonVariant, CSSProperties> = {
  primary: {
    backgroundColor: "var(--color-primary)",
    color: "var(--color-neutral-50)",
    border: "none",
  },
  secondary: {
    backgroundColor: "var(--color-surface)",
    color: "var(--color-primary)",
    border: "1px solid var(--color-border)",
  },
  ghost: {
    backgroundColor: "transparent",
    color: "var(--color-primary)",
    border: "none",
  },
  danger: {
    backgroundColor: "var(--color-error)",
    color: "var(--color-neutral-50)",
    border: "none",
  },
};

const focusStyles: CSSProperties = {
  outline: "2px solid var(--color-info)",
  outlineOffset: "2px",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  isDisabled = false,
  onClick,
  type = "button",
  className = "",
  style,
  id,
  ariaLabel,
  ariaExpanded,
  ariaControls,
  ariaHasPopup,
}: ButtonProps) {
  const disabled = isDisabled || isLoading;
  const padding = sizePaddingMap[size];

  const baseStyles: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-2)",
    paddingBlock: padding.block,
    paddingInline: padding.inline,
    fontSize: sizeFontSizeMap[size],
    fontWeight: 500,
    lineHeight: 1.5,
    borderRadius: "var(--radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "background-color var(--motion-state-ms) ease, transform var(--motion-state-ms) ease, box-shadow var(--motion-state-ms) ease",
    minHeight: size === "sm" ? "32px" : size === "md" ? "40px" : "48px",
    minWidth: "fit-content",
    ...variantStyles[variant],
    ...style,
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onClick?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!disabled) {
        onClick?.(event as unknown as MouseEvent<HTMLButtonElement>);
      }
    }
  };

  return (
    <button
      type={type}
      id={id}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className}
      style={baseStyles}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-haspopup={ariaHasPopup}
      onFocus={(e) => {
        Object.assign(e.currentTarget.style, focusStyles);
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = "none";
        e.currentTarget.style.outlineOffset = "0";
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          if (variant === "primary" || variant === "danger") {
            e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
          } else if (variant === "secondary") {
            e.currentTarget.style.backgroundColor = "var(--color-neutral-100)";
          } else if (variant === "ghost") {
            e.currentTarget.style.backgroundColor = "var(--color-neutral-100)";
          }
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = variantStyles[variant].backgroundColor as string;
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "scale(0.98)";
        }
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {isLoading ? (
        <>
          <LoadingSpinner />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function LoadingSpinner() {
  const spinnerStyle: CSSProperties = {
    width: "1em",
    height: "1em",
    border: "2px solid currentColor",
    borderRightColor: "transparent",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  };

  return <span style={spinnerStyle} aria-hidden="true" />;
}
