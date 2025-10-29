"use client";

import React from "react";

type LoadingOverlayProps = {
  show: boolean;
  label?: string;
};

export function LoadingOverlay({ show, label }: LoadingOverlayProps) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-lg bg-white/90 shadow-xl">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-gray-800">
          {label || "Loading..."}
        </span>
      </div>
    </div>
  );
}