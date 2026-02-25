import { cn } from "@/lib/utils";

interface TabsProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  size?: "sm" | "md";
}

export function Tabs({ tabs, activeTab, onTabChange, size = "md" }: TabsProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 bg-bg rounded-lg p-1",
        size === "sm" ? "text-[0.72rem]" : "text-[0.8rem]"
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "rounded-md font-medium transition-all cursor-pointer",
              size === "sm" ? "px-3 py-1" : "px-4 py-1.5",
              isActive
                ? "bg-surface text-text shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
