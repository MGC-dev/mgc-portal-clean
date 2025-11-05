"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function LogoutButton() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const withTimeout = async <T,>(p: Promise<T>, ms = 2500): Promise<T | null> => {
    return new Promise<T | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      p.then((val) => {
        clearTimeout(timer);
        resolve(val);
      }).catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
    });
  };

  const onLogout = async () => {
    try {
      setLoading(true);
      // Wait longer to allow cookies/session to clear reliably
      await withTimeout(signOut(), 6000);
    } catch (e) {
      // Soft-fail
    } finally {
      // Use hard navigation for reliability across server components
      if (typeof window !== "undefined") {
        window.location.href = "/auth/logout";
      } else {
        router.replace("/auth/logout");
      }
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onLogout}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      title="Sign out"
    >
      <LogOut size={16} />
      <span>Logout</span>
    </button>
  );
}