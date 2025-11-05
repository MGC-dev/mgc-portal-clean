"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ForgotResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingForgot, setLoadingForgot] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoadingForgot(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send reset link");
      } else {
        setMessage(data.message || "If the email exists, a reset link has been sent.");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again later!");
    } finally {
      setLoadingForgot(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoadingReset(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reset failed.");
      } else {
        setResetMessage(data.message || "Password has been reset successfully!");
      }
    } catch (err: any) {
      setError(err?.message || "Reset failed.");
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/modern-office-building.png')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-slate-900/50 to-blue-800/60" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Logo/Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg flex items-center justify-center shadow-xl overflow-hidden">
            <Image src="/logo.png" alt="MG Consulting logo" width={48} height={48} priority style={{ objectFit: "contain" }} />
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">MG Consulting Firm</h1>
          <p className="text-white/90 drop-shadow-md">
            {token ? "Reset your password" : "Forgot your password"}
          </p>
        </div>

        <Card className="bg-white/15 backdrop-blur-xl border border-white/20 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-white">{token ? "Reset Password" : "Forgot Password"}</CardTitle>
            <CardDescription className="text-white/80">
              {token
                ? "Enter and confirm a new password for your account"
                : "Enter your email to receive a password reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            {!token ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  disabled={loadingForgot}
                >
                  {"Send Reset Link"}
                </Button>
                {message && (
                  <p className="text-center text-sm text-green-300">{message}</p>
                )}
                <div className="text-center">
                  <Link href="/login" className="text-blue-200 hover:text-white underline underline-offset-2 text-sm">
                    Back to login
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-white">New Password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:border-white/40 focus:ring-white/20"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  disabled={loadingReset}
                >
                  {"Reset Password"}
                </Button>
                {resetMessage && (
                  <p className="text-center text-sm text-green-300">{resetMessage}</p>
                )}
                <div className="text-center">
                  <Link href="/login" className="text-blue-200 hover:text-white underline underline-offset-2 text-sm">
                    Back to login
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="text-center space-y-2">
          <div className="flex justify-center space-x-4 text-xs text-white/80 drop-shadow-sm">
            <Link href="/privacy" className="hover:text-white underline underline-offset-2">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white underline underline-offset-2">Terms of Service</Link>
          </div>
        </div>
      </div>
    </div>
  );
}