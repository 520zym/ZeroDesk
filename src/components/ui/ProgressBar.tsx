import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  variant?: "primary" | "success" | "danger" | "warning";
  size?: "sm" | "md";
}

const variantColors: Record<string, string> = {
  primary: "bg-primary",
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
};

export function ProgressBar({
  value,
  variant = "primary",
  size = "md",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn(
        "w-full rounded-full bg-bg-alt overflow-hidden",
        size === "sm" ? "h-1.5" : "h-2"
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          variantColors[variant]
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
