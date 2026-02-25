import { cn } from "@/lib/utils";

interface AvatarProps {
  char: string;
  color: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

interface AvatarStackProps {
  avatars: { char: string; color: string }[];
  size?: "xs" | "sm";
}

const sizeMap = {
  xs: "w-5 h-5 text-[0.55rem]",
  sm: "w-7 h-7 text-[0.65rem]",
  md: "w-9 h-9 text-[0.78rem]",
  lg: "w-11 h-11 text-[0.9rem]",
  xl: "w-14 h-14 text-[1.05rem]",
} as const;

export function Avatar({ char, color, size = "md", className }: AvatarProps) {
  const isClass = color.startsWith("bg-");

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0",
        sizeMap[size],
        isClass && color,
        className
      )}
      style={isClass ? undefined : { backgroundColor: color }}
    >
      {char.charAt(0).toUpperCase()}
    </div>
  );
}

export function AvatarStack({ avatars, size = "sm" }: AvatarStackProps) {
  return (
    <div className="flex items-center -space-x-1.5">
      {avatars.map((a, i) => (
        <Avatar
          key={i}
          char={a.char}
          color={a.color}
          size={size}
          className="ring-2 ring-surface"
        />
      ))}
    </div>
  );
}
