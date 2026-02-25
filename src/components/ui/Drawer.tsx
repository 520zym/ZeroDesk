import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = "340px",
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
        style={{ animation: "fade-in 0.15s ease-out" }}
        onClick={onClose}
      />
      <div
        className="ml-auto relative h-full bg-surface border-l border-border-light shadow-xl flex flex-col"
        style={{
          width,
          maxWidth: "calc(100vw - 48px)",
          animation: "slide-right 0.2s ease-out",
          transformOrigin: "right",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-light shrink-0">
          <h2 className="text-[0.92rem] font-semibold text-text tracking-tight">
            {title}
          </h2>
          <button
            onClick={onClose}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-lg",
              "text-text-muted hover:text-text hover:bg-bg-alt",
              "transition-colors cursor-pointer"
            )}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-border-light shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
