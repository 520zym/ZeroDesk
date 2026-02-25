import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "520px",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        style={{ animation: "fade-in 0.15s ease-out" }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="relative bg-surface rounded-xl shadow-xl border border-border-light overflow-hidden"
        style={{
          width,
          maxWidth: "calc(100vw - 48px)",
          maxHeight: "calc(100vh - 80px)",
          animation: "scale-in 0.2s ease-out",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-[0.95rem] font-semibold text-text tracking-tight">
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
        <div className="px-6 py-5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
