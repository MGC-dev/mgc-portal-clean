"use client";

import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

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
    <span aria-hidden="true" className="[&_svg]:size-6">
      <LoadingIndicator type="line-simple" size="sm" />
    </span>
  );

  const pulseDot = (
    <span aria-hidden="true" className="[&_svg]:size-5">
      <LoadingIndicator type="dot-circle" size="sm" />
    </span>
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