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
        console.log("Login successful, session established.");
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
