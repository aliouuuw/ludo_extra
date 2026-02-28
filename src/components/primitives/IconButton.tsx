import type { LucideIcon } from "lucide-react";
import type { CSSProperties, MouseEvent, KeyboardEvent } from "react";

export type IconButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps {
  icon: LucideIcon;
  ariaLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: CSSProperties;
  id?: string;
  ariaExpanded?: boolean;
  ariaControls?: string;
  ariaHasPopup?: boolean | "dialog" | "menu" | "listbox" | "tree" | "grid";
}

const sizeMap: Record<IconButtonSize, { dimension: string; iconSize: number }> = {
  sm: { dimension: "32px", iconSize: 16 },
  md: { dimension: "40px", iconSize: 20 },
  lg: { dimension: "48px", iconSize: 24 },
};

const variantStyles: Record<IconButtonVariant, CSSProperties> = {
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
    color: "var(--color-neutral-600)",
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

export function IconButton({
  icon: Icon,
  ariaLabel,
  variant = "ghost",
  size = "md",
  isLoading = false,
  isDisabled = false,
  onClick,
  className = "",
  style,
  id,
  ariaExpanded,
  ariaControls,
  ariaHasPopup,
}: IconButtonProps) {
  const disabled = isDisabled || isLoading;
  const sizeConfig = sizeMap[size];

  const baseStyles: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: sizeConfig.dimension,
    height: sizeConfig.dimension,
    borderRadius: "var(--radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition: "background-color var(--motion-state-ms) ease, transform var(--motion-state-ms) ease, box-shadow var(--motion-state-ms) ease",
    padding: 0,
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
      type="button"
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
          e.currentTarget.style.transform = "scale(0.95)";
        }
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      {isLoading ? (
        <LoadingSpinner size={sizeConfig.iconSize} />
      ) : (
        <Icon size={sizeConfig.iconSize} aria-hidden="true" />
      )}
    </button>
  );
}

interface LoadingSpinnerProps {
  size: number;
}

function LoadingSpinner({ size }: LoadingSpinnerProps) {
  const spinnerStyle: CSSProperties = {
    width: size,
    height: size,
    border: "2px solid currentColor",
    borderRightColor: "transparent",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  };

  return <span style={spinnerStyle} aria-hidden="true" />;
}
