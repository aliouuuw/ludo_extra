import type { ReactNode, CSSProperties } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Modal } from "../composites/Modal";
import { Button } from "../primitives/Button";
import { Text } from "../primitives/Text";

export type ConfirmDialogVariant = "default" | "destructive";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  icon?: ReactNode;
  className?: string;
  style?: CSSProperties;
  id?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "default",
  icon,
  className = "",
  style,
  id,
}: ConfirmDialogProps) {
  const isDestructive = variant === "destructive";

  const contentStyles: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-4)",
    ...style,
  };

  const headerStyles: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "var(--space-3)",
  };

  const iconStyles: CSSProperties = {
    color: isDestructive ? "var(--color-error)" : "var(--color-warning)",
    flexShrink: 0,
    marginTop: "var(--space-1)",
  };

  const actionsStyles: CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: "var(--space-3)",
    marginTop: "var(--space-2)",
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const defaultIcon = isDestructive ? <Trash2 size={24} /> : <AlertTriangle size={24} />;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      className={className}
      id={id}
      showCloseButton={false}
      ariaLabel={title}
    >
      <div style={contentStyles}>
        <div style={headerStyles}>
          <div style={iconStyles} aria-hidden="true">
            {icon || defaultIcon}
          </div>
          <div>
            <Text variant="h4" as="h3">
              {title}
            </Text>
            {description && (
              <Text variant="sm" color="muted" style={{ marginTop: "var(--space-2)" }}>
                {description}
              </Text>
            )}
          </div>
        </div>
        <div style={actionsStyles}>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? "danger" : "primary"}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
