"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, LifeBuoy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { loadRecentActivity, type ActivityItem } from "./recent-activity";

export default function Topbar() {
  const { user, profile } = useAuth();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRecentActivity(8).then((items) => {
      if (!cancelled) {
        setActivity(items);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Click-away, so the panel behaves like every other dropdown in the portal.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // The feed already only carries the last 24 hours, so anything in it is new.
  const unread = activity.length;

  const name = profile?.full_name || user?.email || "";
  const initials =
    (profile?.full_name || user?.email || "?")
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p: string) => p[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className="h-[79px] shrink-0 flex items-center justify-end gap-2 px-6 sm:px-8">
      {/* Support — one click to the place clients actually need in a hurry. */}
      <Link
        href="/mgdashboard/questions"
        title="Get help"
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium text-[#1d1d1f] hover:bg-black/[0.04] transition-colors"
      >
        <LifeBuoy size={16} className="text-gray-500" />
        <span className="hidden sm:inline">Help</span>
      </Link>

      {/* Notifications */}
      <div className="relative" ref={wrapRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}
          aria-expanded={open}
          className="relative p-2 rounded-full text-gray-500 hover:text-[#1d1d1f] hover:bg-black/[0.04] transition-colors"
        >
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#a52024] ring-2 ring-white" />
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 w-80 rounded-2xl border border-black/[0.07] bg-white p-2 z-40 animate-in fade-in duration-150">
            <p className="px-3 py-2 text-[12px] font-medium text-gray-400">Recent activity</p>
            {loading ? (
              <div className="px-3 py-4 space-y-2 animate-pulse">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-3 rounded-full bg-black/[0.05]" />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <p className="px-3 py-4 text-[13px] text-gray-500">
                Nothing in the last 24 hours.
              </p>
            ) : (
              <ul className="max-h-[360px] overflow-y-auto">
                {activity.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-black/[0.03] transition-colors"
                    >
                      <span className={`shrink-0 w-7 h-7 rounded-lg ${item.iconBg} flex items-center justify-center mt-0.5`}>
                        <item.icon size={13} className={item.iconColor} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-[#1d1d1f]">{item.title}</span>
                        <span className="block text-[12px] text-gray-500 truncate">{item.description}</span>
                        <span className="block text-[11px] text-gray-400 mt-0.5">
                          {item.time ? formatDistanceToNow(new Date(item.time), { addSuffix: true }) : ""}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Profile */}
      <Link
        href="/mgdashboard/company"
        title={name}
        className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full hover:bg-black/[0.04] transition-colors"
      >
        <span className="w-8 h-8 rounded-full bg-[#264f5e] text-white text-[12px] font-semibold flex items-center justify-center shrink-0">
          {initials}
        </span>
        <span className="hidden sm:block text-[13px] font-medium text-[#1d1d1f] whitespace-nowrap">
          {profile?.full_name || user?.email}
        </span>
      </Link>
    </div>
  );
}
