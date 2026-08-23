"use client";

import { Search } from "lucide-react";

export function FilterInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--dev-text-tertiary)] pointer-events-none"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full bg-[var(--dev-surface-sunken)] border border-[var(--dev-hairline)] pl-10 pr-4 py-2.5 text-[13px] text-[var(--dev-text)] placeholder:text-[var(--dev-text-tertiary)] focus:outline-none focus:bg-white focus:border-[var(--dev-accent)] focus:ring-4 focus:ring-[var(--dev-accent-soft)] transition-all duration-200"
      />
    </div>
  );
}
