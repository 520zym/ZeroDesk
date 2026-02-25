import { cn } from "@/lib/utils";

type BadgeVariant =
  | "running"
  | "completed"
  | "failed"
  | "draft"
  | "paused"
  | "blocked"
  | "archived";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { dot: string; badge: string }> = {
  running: {
    dot: "bg-primary",
    badge: "bg-primary-light text-primary",
  },
  completed: {
    dot: "bg-success",
    badge: "bg-success-light text-success",
  },
  failed: {
    dot: "bg-danger",
    badge: "bg-danger-light text-danger",
  },
  draft: {
    dot: "bg-text-muted",
    badge: "bg-bg-alt text-text-secondary",
  },
  paused: {
    dot: "bg-warning",
    badge: "bg-warning-light text-warning",
  },
  blocked: {
    dot: "bg-coral",
    badge: "bg-coral-light text-coral",
  },
  archived: {
    dot: "bg-text-muted",
    badge: "bg-bg-deep text-text-muted",
  },
};

export function Badge({ variant, children }: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full",
        "text-[0.7rem] font-medium leading-5",
        styles.badge
      )}
    >
      <span
        className={cn("w-1.5 h-1.5 rounded-full shrink-0", styles.dot)}
      />
      {children}
    </span>
  );
}

export type { BadgeVariant, BadgeProps };
