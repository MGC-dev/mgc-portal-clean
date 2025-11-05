"use client";

import { LoadingOverlay } from "@/components/ui/loading-overlay";

export default function AdminLoading() {
  return <LoadingOverlay show={true} label="Loading admin…" variant="default" />;
}