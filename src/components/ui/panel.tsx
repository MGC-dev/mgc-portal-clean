import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Flat content card: white surface, hairline border, generous radius — the
 * container style used by the dashboard's task table and any panel that needs
 * to sit apart from the page background. No shadow; the border does the work.
 */
export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel"
      className={cn(
        "bg-white rounded-2xl border border-black/[0.07] p-5 sm:p-6",
        className
      )}
      {...props}
    />
  );
}

export default Panel;
