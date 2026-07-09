"use client";

import type React from "react";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("[v0] Error fetching profile:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("[v0] Error in fetchProfile:", error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    const getInitialUser = async () => {
      try {
        console.log("[auth] Getting initial user...");
        // getUser() validates the session server-side and reads the cookie.
        // getSession() only reads the locally-cached JWT, which is absent when
        // login was performed on a different tab/page or after a hard refresh
        // before the client's in-memory state is repopulated.
        const { data, error } = await supabase.auth.getUser();

        if (error) {
          // A getUser() error does NOT mean the user is signed out — it can be
          // a transient network error. Do not clear state here; let
          // onAuthStateChange carry the authoritative result.
          console.warn("[auth] getUser error (non-fatal):", error.message);
        }

        const u = data?.user ?? null;
        console.log("[auth] Initial user:", u ? "Found" : "None");

        if (u) {
          setUser(u);
          console.log("[auth] Fetching profile for user:", u.id);
          const profileData = await fetchProfile(u.id);
          setProfile(profileData);
          console.log("[auth] Profile loaded:", profileData ? "Success" : "Failed");
        }
      } catch (e) {
        console.error("[auth] init error:", e);
      } finally {
        console.log("[auth] Setting loading to false");
        setLoading(false);
      }
    };

    getInitialUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[auth] Auth state changed:", event);
      if (session?.user) {
        setUser(session.user);
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);


  const signOut = async () => {
    // Request a global sign-out to ensure all tabs and cookies are cleared
    await withTimeout(supabase.auth.signOut({ scope: 'global' }), 6000);

    // Best-effort: verify session cleared; retry once if needed
    const { data: first } = await supabase.auth.getSession();
    if (first?.session) {
      await new Promise((r) => setTimeout(r, 500));
      const { data: second } = await supabase.auth.getSession();
      if (second?.session) {
        // Proceed anyway; middleware will treat you as authenticated if cookie remains
      }
    }

    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
