"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

export function LoginForm() {
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [clientError, setClientError] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    try {
      const client = createClient();
      setSupabaseClient(client);
    } catch (err) {
      setClientError(
        err instanceof Error
          ? err.message
          : "Failed to initialize Supabase client"
      );
    }
  }, []);

  const withTimeout = async <T,>(p: Promise<T>, ms = 15000): Promise<T | null> => {
    return new Promise<T | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), ms);
      p.then((val) => {
        clearTimeout(timer);
        resolve(val);
      }).catch((err) => {
        clearTimeout(timer);
        console.error("Auth request failed:", err);
        resolve(null);
      });
    });
  };

  const attemptSignIn = async (email: string, password: string, retryCount = 0): Promise<any> => {
    const maxRetries = 2;

    try {
      console.log(`Sign-in attempt ${retryCount + 1}/${maxRetries + 1} via server API`);

      const res = await withTimeout(
        fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({ email, password }),
        }),
        12000
      );

      if (!res && retryCount < maxRetries) {
        console.log(`Attempt ${retryCount + 1} timed out, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return attemptSignIn(email, password, retryCount + 1);
      }

      if (!res) return null;

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { data: {}, error: { message: json?.error || "Authentication failed", status: res.status } };
      }

      return { data: { user: json?.user || null }, error: null };
    } catch (error) {
      console.error(`Sign-in attempt ${retryCount + 1} failed:`, error);
      if (retryCount < maxRetries) {
        console.log(`Retrying after error...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return attemptSignIn(email, password, retryCount + 1);
      }
      throw error;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!supabaseClient) {
        setError(
          clientError ||
            "Supabase client not initialized. Please check your environment variables."
        );
        setLoading(false);
        return;
      }

      if (!loginData.email || !loginData.password) {
        setError("Email and Password are required!");
        setLoading(false);
        return;
      }

      console.log("Starting authentication with retry logic...");
      const result = await attemptSignIn(loginData.email, loginData.password);

      if (!result) {
        setError(
          "Authentication failed after multiple attempts. This may indicate a network issue or service problem. Please try again in a few minutes or contact support if the issue persists."
        );
        setLoading(false);
        return;
      }

      const { data, error } = result;

      if (error) {
        console.error("Supabase auth error:", error);
        const msg = (error.message || "").toLowerCase();
        const status = (error as any)?.status ?? 0;

        // Immediate banned/suspended detection regardless of status shape
        const isBanned = msg.includes("ban") || msg.includes("suspend") || msg.includes("blocked");
        if (isBanned) {
          router.replace("/suspended");
          return;
        }

        // Handle specific error cases
        if (status === 400 && msg.includes("invalid")) {
          setError("Invalid email or password. Please check your credentials and try again.");
        } else if (status === 422 && msg.includes("email")) {
          setError("Please enter a valid email address.");
        } else if (status === 429) {
          setError("Too many login attempts. Please wait a few minutes before trying again.");
        } else if (status === 403) {
          setError("Access denied. Please contact support if this persists.");
        } else if (status >= 500) {
          setError("Server error occurred. Please try again.");
        } else if (msg.includes("network") || msg.includes("timeout") || msg.includes("connection")) {
          setError("Network connection issue detected. Please check your internet connection and try again.");
        } else {
          setError(error.message || "Authentication failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        console.log("Login successful, establishing session...");
        setLoginData({ email: "", password: "" });
        // Keep overlay active until navigation/unmount
        window.location.href = "/mgdashboard";
        return;
      }

      // If we get here, something unexpected happened
      setError("Login failed unexpectedly. Please try again or contact support.");
      setLoading(false);
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred during login. Please check your network connection and try again.");
      setLoading(false);
    }
  };

  // Diagnostics removed

  if (clientError) {
    return (
      <div className="text-center p-4">
        <p className="text-red-200 mb-4">{clientError}</p>
        <p className="text-white/80 text-sm">
          Please add your Supabase integration in the project settings to
          continue.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <LoadingOverlay show={loading} label="Signing you in..." variant="default" />
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-2 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-white">
          Email Address
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          value={loginData.email}
          onChange={handleInputChange}
          required
          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-white">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          value={loginData.password}
          onChange={handleInputChange}
          required
          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20"
        />
      </div>

      <div className="flex items-center justify-between">
        <Link
          href="/register/forgotpassword"
          className="text-sm text-blue-200 hover:text-white"
        >
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
        disabled={loading}
      >
        {"Sign In"}
      </Button>
    </form>
  );
}
