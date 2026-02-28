import type { ReactNode, CSSProperties } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Text } from "../primitives/Text";
import { Button } from "../primitives/Button";

export interface ErrorStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
  className?: string;
  style?: CSSProperties;
  id?: string;
}

export function ErrorState({
  icon = <AlertCircle size={48} strokeWidth={1.5} />,
  title = "Une erreur s'est produite",
  description = "Veuillez réessayer ou contacter le support si le problème persiste.",
  onRetry,
  retryLabel = "Réessayer",
  onSecondaryAction,
  secondaryActionLabel,
  className = "",
  style,
  id,
}: ErrorStateProps) {
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
    color: "var(--color-error)",
    marginBottom: "var(--space-2)",
  };

  const actionsStyles: CSSProperties = {
    display: "flex",
    gap: "var(--space-3)",
    marginTop: "var(--space-2)",
  };

  return (
    <div id={id} className={className} style={containerStyles} role="alert">
      <div style={iconStyles} aria-hidden="true">
        {icon}
      </div>
      <Text variant="h3" as="h2" color="error">
        {title}
      </Text>
      {description && (
        <Text variant="base" color="muted">
          {description}
        </Text>
      )}
      {(onRetry || onSecondaryAction) && (
        <div style={actionsStyles}>
          {onRetry && (
            <Button variant="primary" onClick={onRetry}>
              <RefreshCw size={16} style={{ marginRight: "var(--space-2)" }} />
              {retryLabel}
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
