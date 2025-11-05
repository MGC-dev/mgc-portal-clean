"use client";

import React from "react";

type AlertBannerProps = {
  variant?: "success" | "error" | "info" | "warning";
  message: string;
  onClose?: () => void;
  className?: string;
};

const variantClasses: Record<Required<AlertBannerProps>["variant"], string> = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
};

export function AlertBanner({ variant = "info", message, onClose, className = "" }: AlertBannerProps) {
  return (
    <div
      className={`flex items-start justify-between gap-3 px-3 py-2 border rounded-md ${variantClasses[variant]} ${className}`}
      role="alert"
    >
      <div className="text-sm">{message}</div>
      {onClose && (
        <button
          aria-label="Close"
          className="text-xs underline hover:opacity-80"
          onClick={onClose}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

export default AlertBanner;