import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  features?: Feature[];
  accentColor?: string;
  accentBg?: string;
  badge?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  features,
  accentColor = "text-primary",
  accentBg = "bg-primary-light",
  badge,
}: EmptyStateProps) {
  return (
    <div className="py-12" style={{ animation: "fade-in-up 0.35s ease-out" }}>
      <div className="max-w-lg mx-auto text-center mb-8">
        <div
          className={cn(
            "w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center",
            accentBg
          )}
        >
          <Icon size={24} className={accentColor} strokeWidth={1.8} />
        </div>
        <h3 className="text-[1.1rem] font-bold text-text mb-1.5 tracking-tight">
          {title}
        </h3>
        <p className="text-[0.82rem] text-text-secondary leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
        {badge && (
          <span className="inline-flex items-center mt-3 px-2.5 py-1 rounded-full text-[0.68rem] font-medium bg-lavender-light text-lavender">
            {badge}
          </span>
        )}
      </div>

      {features && features.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="bg-surface border border-border-light rounded-xl px-4 py-4 text-center transition-all hover:shadow-md hover:border-primary/20 cursor-default"
              style={{ animation: `fade-in 0.3s ease-out ${0.1 + i * 0.08}s both` }}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg mx-auto mb-2.5 flex items-center justify-center",
                  accentBg
                )}
              >
                <f.icon size={16} className={accentColor} strokeWidth={1.8} />
              </div>
              <div className="text-[0.8rem] font-semibold text-text mb-0.5">
                {f.title}
              </div>
              <div className="text-[0.72rem] text-text-muted leading-relaxed">
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
