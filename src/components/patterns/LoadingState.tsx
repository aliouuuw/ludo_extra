import type { CSSProperties } from "react";

export type LoadingStateVariant = "spinner" | "skeleton" | "skeleton-card" | "skeleton-list";

export interface LoadingStateProps {
  variant?: LoadingStateVariant;
  className?: string;
  style?: CSSProperties;
  id?: string;
  ariaLabel?: string;
}

export function LoadingState({
  variant = "spinner",
  className = "",
  style,
  id,
  ariaLabel = "Chargement en cours...",
}: LoadingStateProps) {
  const containerStyles: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--space-8)",
    ...style,
  };

  if (variant === "spinner") {
    return (
      <div
        id={id}
        className={className}
        style={containerStyles}
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            border: "3px solid var(--color-neutral-200)",
            borderTopColor: "var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  if (variant === "skeleton-card") {
    return (
      <div
        id={id}
        className={className}
        style={{
          padding: "var(--space-4)",
          ...style,
        }}
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
      >
        <div style={skeletonCardStyles}>
          <div style={{ ...skeletonBaseStyles, width: "100%", height: "120px", marginBottom: "var(--space-4)" }} />
          <div style={{ ...skeletonBaseStyles, width: "60%", height: "24px", marginBottom: "var(--space-2)" }} />
          <div style={{ ...skeletonBaseStyles, width: "100%", height: "16px", marginBottom: "var(--space-1)" }} />
          <div style={{ ...skeletonBaseStyles, width: "80%", height: "16px" }} />
        </div>
      </div>
    );
  }

  if (variant === "skeleton-list") {
    return (
      <div
        id={id}
        className={className}
        style={{
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          ...style,
        }}
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
      >
        {[1, 2, 3].map((i) => (
          <div key={i} style={skeletonListItemStyles}>
            <div style={{ ...skeletonBaseStyles, width: "40px", height: "40px", borderRadius: "var(--radius-full)" }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ ...skeletonBaseStyles, width: "40%", height: "18px" }} />
              <div style={{ ...skeletonBaseStyles, width: "70%", height: "14px" }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default skeleton
  return (
    <div
      id={id}
      className={className}
      style={{
        padding: "var(--space-4)",
        ...style,
      }}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <div style={{ ...skeletonBaseStyles, width: "100%", height: "200px" }} />
    </div>
  );
}

const skeletonBaseStyles: CSSProperties = {
  backgroundColor: "var(--color-neutral-200)",
  borderRadius: "var(--radius-md)",
  animation: "pulse 2s ease-in-out infinite",
};

const skeletonCardStyles: CSSProperties = {
  backgroundColor: "var(--color-surface)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-sm)",
  padding: "var(--space-4)",
};

const skeletonListItemStyles: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "var(--space-3)",
  backgroundColor: "var(--color-surface)",
  borderRadius: "var(--radius-md)",
  boxShadow: "var(--shadow-sm)",
};
