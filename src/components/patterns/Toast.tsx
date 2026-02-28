import { useEffect, useCallback } from "react";
import type { ReactNode, CSSProperties } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { IconButton } from "../primitives/IconButton";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastProps {
  id: string;
  message: ReactNode;
  variant?: ToastVariant;
  duration?: number;
  onDismiss: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

const variantIconMap: Record<ToastVariant, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const variantColorMap: Record<ToastVariant, string> = {
  success: "var(--color-success)",
  error: "var(--color-error)",
  warning: "var(--color-warning)",
  info: "var(--color-info)",
};

const variantBgMap: Record<ToastVariant, string> = {
  success: "var(--color-success-subtle)",
  error: "var(--color-error-subtle)",
  warning: "var(--color-warning-subtle)",
  info: "var(--color-info-subtle)",
};

export function Toast({
  id,
  message,
  variant = "info",
  duration = 5000,
  onDismiss,
  className = "",
  style,
}: ToastProps) {
  const Icon = variantIconMap[variant];
  const accentColor = variantColorMap[variant];
  const bgColor = variantBgMap[variant];

  const handleDismiss = useCallback(() => {
    onDismiss(id);
  }, [id, onDismiss]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(handleDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, handleDismiss]);

  const containerStyles: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-3)",
    padding: "var(--space-3) var(--space-4)",
    backgroundColor: "var(--color-surface)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)",
    borderLeft: `4px solid ${accentColor}`,
    minWidth: "300px",
    maxWidth: "400px",
    animation: "toastEnter var(--motion-entrance-ms) ease-out",
    ...style,
  };

  const iconStyles: CSSProperties = {
    color: accentColor,
    flexShrink: 0,
    marginTop: "2px",
  };

  const contentStyles: CSSProperties = {
    flex: 1,
    fontSize: "var(--text-sm)",
    lineHeight: 1.5,
    color: "var(--color-neutral-900)",
  };

  return (
    <div
      className={className}
      style={containerStyles}
      role="status"
      aria-live="polite"
    >
      <style>{`
        @keyframes toastEnter {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes toastExit {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
      `}</style>
      <div style={iconStyles} aria-hidden="true">
        <Icon size={20} />
      </div>
      <div style={contentStyles}>{message}</div>
      <IconButton
        icon={X}
        ariaLabel="Fermer"
        variant="ghost"
        size="sm"
        onClick={handleDismiss}
      />
    </div>
  );
}

// Toast container component for positioning
export interface ToastContainerProps {
  children: ReactNode;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  className?: string;
  style?: CSSProperties;
  id?: string;
}

export function ToastContainer({
  children,
  position = "top-right",
  className = "",
  style,
  id,
}: ToastContainerProps) {
  const positionStyles: Record<NonNullable<ToastContainerProps["position"]>, CSSProperties> = {
    "top-right": { top: "var(--space-4)", right: "var(--space-4)" },
    "top-left": { top: "var(--space-4)", left: "var(--space-4)" },
    "bottom-right": { bottom: "var(--space-4)", right: "var(--space-4)" },
    "bottom-left": { bottom: "var(--space-4)", left: "var(--space-4)" },
    "top-center": { top: "var(--space-4)", left: "50%", transform: "translateX(-50%)" },
    "bottom-center": { bottom: "var(--space-4)", left: "50%", transform: "translateX(-50%)" },
  };

  const containerStyles: CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-3)",
    pointerEvents: "none",
    ...positionStyles[position],
    ...style,
  };

  return (
    <div id={id} className={className} style={containerStyles} aria-live="polite" aria-label="Notifications">
      {children}
    </div>
  );
}
