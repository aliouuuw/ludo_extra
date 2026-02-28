import type { ReactNode, CSSProperties } from "react";
import { CircleDashed } from "lucide-react";
import { Text } from "../primitives/Text";
import { Button } from "../primitives/Button";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  style?: CSSProperties;
  id?: string;
}

export function EmptyState({
  icon = <CircleDashed size={48} strokeWidth={1.5} />,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
  style,
  id,
}: EmptyStateProps) {
  const containerStyles: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "var(--space-8)",
    gap: "var(--space-4)",
    ...style,
  };

  const iconStyles: CSSProperties = {
    color: "var(--color-neutral-400)",
    marginBottom: "var(--space-2)",
  };

  const actionsStyles: CSSProperties = {
    display: "flex",
    gap: "var(--space-3)",
    marginTop: "var(--space-2)",
  };

  return (
    <div id={id} className={className} style={containerStyles} role="status">
      <div style={iconStyles} aria-hidden="true">
        {icon}
      </div>
      <Text variant="h3" as="h2">
        {title}
      </Text>
      {description && (
        <Text variant="base" color="muted">
          {description}
        </Text>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <div style={actionsStyles}>
          {actionLabel && onAction && (
            <Button variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
