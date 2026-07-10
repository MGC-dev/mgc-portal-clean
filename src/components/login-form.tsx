"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

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

      const { data, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (authError) {
        console.error("Supabase auth error:", authError);
        const msg = authError.message.toLowerCase();
        
        if (msg.includes("ban") || msg.includes("suspend") || msg.includes("blocked")) {
          window.location.assign("/suspended");
          return;
        }

        if (msg.includes("invalid login credentials")) {
          setError("Invalid email or password. Please check your credentials and try again.");
        } else if (msg.includes("rate limit")) {
          setError("Too many login attempts. Please wait a few minutes before trying again.");
        } else {
          setError(authError.message || "Authentication failed. Please try again.");
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        // Session established — let the router redirect handle the rest.
        setLoginData({ email: "", password: "" });
        // Hard navigation: forces a full HTTP request so the middleware
        // reads the committed session cookie and redirects by role
        // (admins → /admin, clients → /mgdashboard).
        // router.push + router.refresh is soft navigation and can race
        // the cookie write, causing the middleware to miss the session.
        window.location.assign("/");
        return;
      }

      setError("Login failed unexpectedly. Please try again or contact support.");
      setLoading(false);
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred during login. Please check your network connection and try again.");
      setLoading(false);
    }
  };

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
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-[14px]">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[#1d1d1f] text-[14px] font-medium">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="jdoe.mobbin@gmail.com"
          value={loginData.email}
          onChange={handleInputChange}
          required
          className="h-12 bg-white border-zinc-200 text-[#1d1d1f] placeholder:text-[#86868b] focus-visible:ring-[#0071e3]/30 focus-visible:border-[#0071e3] rounded-[10px] transition-all"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-[#1d1d1f] text-[14px] font-medium">
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
          className="h-12 bg-white border-zinc-200 text-[#1d1d1f] placeholder:text-[#86868b] focus-visible:ring-[#0071e3]/30 focus-visible:border-[#0071e3] rounded-[10px] transition-all"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <Link
          href="/register/forgotpassword"
          className="text-[13px] text-[#0071e3] hover:text-[#0077ed] font-medium"
        >
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        className="w-full h-12 bg-[#264f5e] hover:bg-[#1f424e] text-white font-medium rounded-[10px] transition-all"
        disabled={loading}
      >
        {"Continue with Email"}
      </Button>
    </form>
  );
}
