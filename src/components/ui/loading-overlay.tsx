"use client";

type LoadingOverlayProps = {
  show: boolean;
  label?: string;
  variant?: "default" | "minimal" | "pulse";
};

export function LoadingOverlay({ show, label = "Loading...", variant = "minimal" }: LoadingOverlayProps) {
  if (!show) return null;

  const baseOverlay = "fixed inset-0 z-50 flex items-center justify-center";

  const variantStyles = {
    default: "backdrop-blur-sm",
    minimal: "backdrop-blur-sm",
    pulse: "backdrop-blur-sm",
  } as const;

  const spinner = (
    <div
      className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"
      aria-hidden="true"
    />
  );

  const pulseDot = (
    <div className="relative h-3 w-3">
      <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping" />
      <span className="absolute inset-0 rounded-full bg-blue-500" />
    </div>
  );

  return (
    <div className={`${baseOverlay} ${variantStyles[variant]}`}>
      {variant === "default" && (
        <div className="flex items-center gap-3 rounded-xl bg-white/90 px-4 py-3 shadow-lg">
          {spinner}
          <span className="text-sm font-medium text-gray-800">{label}</span>
        </div>
      )}

      {variant === "minimal" && (
        <div className="flex items-center gap-2 rounded-full bg-white/80 text-gray-900 px-3 py-2 shadow">
          {spinner}
          <span className="text-xs">{label}</span>
        </div>
      )}

      {variant === "pulse" && (
        <div className="flex items-center gap-3 rounded-xl bg-white/90 px-4 py-3 shadow-lg text-gray-900 border border-white">
          {pulseDot}
          <span className="text-sm font-medium">{label}</span>
        </div>
      )}
    </div>
  );
}