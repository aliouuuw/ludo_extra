import { useState, useRef, useCallback, useEffect } from "react";
import type { ReactNode, CSSProperties } from "react";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  id?: string;
}

export function Tooltip({
  children,
  content,
  position = "top",
  delay = 300,
  className = "",
  style,
  id,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const positionStyles: Record<TooltipPosition, CSSProperties> = {
    top: {
      bottom: "100%",
      left: "50%",
      transform: "translateX(-50%) translateY(-8px)",
    },
    bottom: {
      top: "100%",
      left: "50%",
      transform: "translateX(-50%) translateY(8px)",
    },
    left: {
      right: "100%",
      top: "50%",
      transform: "translateY(-50%) translateX(-8px)",
    },
    right: {
      left: "100%",
      top: "50%",
      transform: "translateY(-50%) translateX(8px)",
    },
  };

  const tooltipStyles: CSSProperties = {
    position: "absolute",
    backgroundColor: "var(--color-neutral-800)",
    color: "var(--color-neutral-50)",
    padding: "var(--space-2) var(--space-3)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--text-sm)",
    lineHeight: 1.5,
    whiteSpace: "nowrap",
    zIndex: 100,
    pointerEvents: "none",
    boxShadow: "var(--shadow-md)",
    opacity: isVisible || isFocused ? 1 : 0,
    visibility: isVisible || isFocused ? "visible" : "hidden",
    transition: "opacity var(--motion-state-ms) ease, visibility var(--motion-state-ms) ease",
    ...positionStyles[position],
  };

  const containerStyles: CSSProperties = {
    position: "relative",
    display: "inline-flex",
    ...style,
  };

  return (
    <div
      ref={triggerRef}
      id={id}
      className={className}
      style={containerStyles}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {children}
      <div
        role="tooltip"
        style={tooltipStyles}
        aria-hidden={!(isVisible || isFocused)}
      >
        {content}
      </div>
    </div>
  );
}
