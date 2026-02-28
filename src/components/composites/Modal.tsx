import { useEffect, useRef, useCallback } from "react";
import type { ReactNode, CSSProperties, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { IconButton } from "../primitives/IconButton";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  showCloseButton?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: CSSProperties;
  id?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

const sizeMaxWidthMap: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "400px",
  md: "560px",
  lg: "720px",
};

export function Modal({
  isOpen,
  onClose,
  children,
  title,
  showCloseButton = true,
  size = "md",
  className = "",
  style,
  id,
  ariaLabel,
  ariaDescribedBy,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }

    if (event.key === "Tab") {
      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";

      const timer = setTimeout(() => {
        if (modalRef.current) {
          const focusableElement = modalRef.current.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          focusableElement?.focus();
        }
      }, 0);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
      };
    } else {
      previousActiveElement.current?.focus();
    }
  }, [isOpen]);

  const overlayStyles: CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: isOpen ? "flex" : "none",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-4)",
    zIndex: 1000,
  };

  const modalStyles: CSSProperties = {
    backgroundColor: "var(--color-surface)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-lg)",
    maxWidth: sizeMaxWidthMap[size],
    width: "100%",
    maxHeight: "calc(100vh - var(--space-8))",
    overflow: "auto",
    position: "relative",
    animation: isOpen ? "modalEnter var(--motion-entrance-ms) ease-out" : undefined,
    ...style,
  };

  const headerStyles: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "var(--space-4) var(--space-4) 0",
    gap: "var(--space-4)",
  };

  const contentStyles: CSSProperties = {
    padding: title || showCloseButton ? "var(--space-4)" : 0,
  };

  if (!isOpen) return null;

  return (
    <div
      style={overlayStyles}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <style>{`
        @keyframes modalEnter {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      <div
        ref={modalRef}
        id={id}
        className={className}
        style={modalStyles}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        aria-describedby={ariaDescribedBy}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {(title || showCloseButton) && (
          <div style={headerStyles}>
            {title && (
              <h2
                style={{
                  margin: 0,
                  fontSize: "var(--text-h3)",
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: "var(--color-neutral-900)",
                }}
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <IconButton
                icon={X}
                ariaLabel="Fermer"
                variant="ghost"
                size="sm"
                onClick={onClose}
              />
            )}
          </div>
        )}
        <div style={contentStyles}>{children}</div>
      </div>
    </div>
  );
}
