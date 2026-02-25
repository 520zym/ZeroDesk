import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  value: string;
  label: string;
  change?: { value: string; direction: "up" | "down" };
  ring?: string;
}

export function StatCard({
  icon: Icon,
  iconColor,
  iconBg,
  value,
  label,
  change,
  ring,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border-light rounded-xl p-4",
        "transition-all hover:shadow-card-hover hover:border-primary/15",
        ring
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center",
            iconBg
          )}
        >
          <Icon size={17} className={iconColor} strokeWidth={1.8} />
        </div>
        {change && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[0.68rem] font-medium px-1.5 py-0.5 rounded-md",
              change.direction === "up"
                ? "text-success bg-success-light"
                : "text-danger bg-danger-light"
            )}
          >
            {change.direction === "up" ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {change.value}
          </span>
        )}
      </div>
      <div className="text-[1.25rem] font-bold text-text tracking-tight leading-none mb-0.5">
        {value}
      </div>
      <div className="text-[0.72rem] text-text-muted">{label}</div>
    </div>
  );
}
