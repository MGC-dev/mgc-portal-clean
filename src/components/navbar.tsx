"use client";

import React from "react";
import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import LogoutButton from "./logout-button";

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <button
          className="md:hidden inline-flex items-center justify-center rounded-md border p-2 hover:bg-gray-50"
          aria-label="Open sidebar"
          onClick={onMenuClick}
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <LogoutButton />
      </div>
    </div>
  );
}
