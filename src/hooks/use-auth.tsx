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
    const getInitialSession = async () => {
      try {
        console.log("[v0] Getting initial session...");
        // Use timeout to avoid hanging indefinitely if desktop blocks requests
        const get = withTimeout(supabase.auth.getSession(), 6000);
        const result = await get;
        const session = result?.data?.session ?? null;
        const sessionError = (result as any)?.error ?? null;

        if (sessionError) {
          console.error("[v0] Session error:", sessionError);
        }

        console.log("[v0] Session:", session ? "Found" : "None");
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log("[v0] Fetching profile for user:", session.user.id);
          const profileData = await fetchProfile(session.user.id);
          setProfile(profileData);
          console.log(
            "[v0] Profile loaded:",
            profileData ? "Success" : "Failed"
          );
        }
      } catch (error) {
        console.error("[v0] Error in getInitialSession:", error);
      } finally {
        console.log("[v0] Setting loading to false");
        setLoading(false);
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[v0] Auth state changed:", event);
      setUser(session?.user ?? null);

      if (session?.user) {
        const profileData = await fetchProfile(session.user.id);
        setProfile(profileData);
      } else {
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
