"use client";

import type React from "react";

import {
  Calendar,
  CreditCard,
  FileText,
  Plus,
  TrendingUp,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  Building2,
} from "lucide-react";
import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { motion } from "framer-motion";
// import AppointmentTimeline from "./UpcomingAppointments";
// import InvoiceDonut from "./InvoiceChartFix";
// Scheduling handled via Calendly; in-app scheduler removed
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase";

// Card Props
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

// StatCard Props
interface StatCardProps {
  label: string;
  value: string | number;
  sub: React.ReactNode;
  icon: React.ElementType;
  tone?: "blue" | "amber" | "rose" | "green";
}

// Appointment Props
interface AppointmentProps {
  tone?: "blue" | "teal";
  title: string;
  date: string;
  withJoin?: boolean;
}

// QuickAction Props
interface QuickActionProps {
  icon: React.ElementType;
  tone?: "blue" | "amber" | "rose" | "green";
  text: string;
}

// Activity Props
interface ActivityProps {
  icon: React.ElementType;
  tone?: "green" | "amber" | "rose";
  title: string;
  sub: string;
  date: string;
}


export default function DashboardPage() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  // Appointment history and activity removed from Overview per request.

  return (
    <div className="flex h-screen bg-white text-gray-900">
      {/* Sidebar */}
      <div className="hidden md:block" onClick={() => setSidebarOpen(false)}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Sidebar (mobile overlay) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Blur overlay */}
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar drawer */}
          <div className="relative z-50 w-64 bg-white shadow-lg">
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main column (Navbar + Content) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header className="flex items-center justify-between gap-4 px-6 py-3 border-b bg-white">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6 bg-white">
          {/* Greeting */}
          <div className="mb-6">
            <h1 className="text-4xl font-extrabold tracking-tight">
              Welcome back, {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
            </h1>
            <p className="text-gray-600 mt-1">
              Here&apos;s what&apos;s happening with your account today.
            </p>
          </div>

          {/* Booking CTA only */}
          <div className="grid grid-cols-1 gap-4 mb-8">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Book an Appointment</h3>
                  <p className="text-sm text-gray-600">Schedule your session via our Calendly booking page.</p>
                </div>
                <Link href="/mgdashboard/appointments" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
                  <Calendar size={16} />
                  <span>Open Booking</span>
                </Link>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Quick Actions</h3>
              <span className="text-xs text-gray-500">Handy links to common tasks</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Link href="/mgdashboard/appointments" className="w-full">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100">
                  <span className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Calendar size={16} className="text-blue-700" />
                  </span>
                  <span className="text-sm font-medium text-gray-800">Book an appointment</span>
                </div>
              </Link>
              <Link href="/mgdashboard/company" className="w-full">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100">
                  <span className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Building2 size={16} className="text-amber-700" />
                  </span>
                  <span className="text-sm font-medium text-gray-800">Update company profile</span>
                </div>
              </Link>
              <Link href="/mgdashboard/contracts" className="w-full">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100">
                  <span className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center">
                    <FileText size={16} className="text-rose-700" />
                  </span>
                  <span className="text-sm font-medium text-gray-800">View contracts</span>
                </div>
              </Link>
              <Link href="/mgdashboard/billing" className="w-full">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100">
                  <span className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <CreditCard size={16} className="text-green-700" />
                  </span>
                  <span className="text-sm font-medium text-gray-800">Billing & invoices</span>
                </div>
              </Link>
              <Link href="/mgdashboard/questions" className="w-full">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100">
                  <span className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <HelpCircle size={16} className="text-indigo-700" />
                  </span>
                  <span className="text-sm font-medium text-gray-800">Ask a question</span>
                </div>
              </Link>
            </div>
          </Card>

          {/* Getting Started Checklist */}
          <Card className="mb-8">
            <h3 className="font-semibold text-lg mb-3">Getting Started</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </span>
                <div>
                  <p className="text-sm font-medium">Complete your company profile</p>
                  <p className="text-xs text-gray-600">Ensure your contact details and company info are up to date.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </span>
                <div>
                  <p className="text-sm font-medium">Schedule your onboarding call</p>
                  <p className="text-xs text-gray-600">Book time with our team to align on goals and milestones.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </span>
                <div>
                  <p className="text-sm font-medium">Review contracts & billing</p>
                  <p className="text-xs text-gray-600">Access agreements and manage invoices from your dashboard.</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Help & Support */}
          <Card>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-lg">Need help?</h3>
                <p className="text-sm text-gray-600">Visit Support to ask a question or get assistance from our team.</p>
              </div>
              <Link href="/mgdashboard/questions" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
                <HelpCircle size={16} />
                <span>Go to Support</span>
              </Link>
            </div>
          </Card>

          {/* Appointment history and lists removed */}

          {/* Charts */}
          {/* Charts removed from Overview as requested */}
          {/* End Charts */}

          {/* Bottom section removed to eliminate activity/history */}
        </main>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: CardProps) {
  return (
    <section
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-5 ${className}`}
    >
      {children}
    </section>
  );
}

function StatCard({ label, value, sub, icon: Icon, tone = "blue" }: StatCardProps) {
  const tones = {
    blue: ["text-blue-600", "bg-blue-50", "border-blue-100"],
    amber: ["text-amber-600", "bg-amber-50", "border-amber-100"],
    rose: ["text-rose-600", "bg-rose-50", "border-rose-100"],
    green: ["text-green-600", "bg-green-50", "border-green-100"],
  }[tone];

  return (
    <Card>
      <div className="flex justify-between items-start">
        <p className="text-[11px] font-semibold tracking-wide text-gray-500">
          {label}
        </p>
        <span
          className={`inline-flex items-center justify-center rounded-lg p-2 ${tones[1]} ${tones[2]}`}
        >
          <Icon size={18} className={tones[0]} />
        </span>
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-gray-600 mt-0.5">{sub}</div>
      </div>
    </Card>
  );
}

function Appointment({ tone = "blue", title, date, withJoin = false }: AppointmentProps) {
  const toneMap = {
    blue: ["bg-blue-50", "text-blue-700"],
    teal: ["bg-teal-50", "text-teal-700"],
  }[tone];

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex items-start gap-3">
        <span
          className={`h-10 w-10 rounded-xl ${toneMap[0]} flex items-center justify-center`}
        >
          <Calendar size={18} className={toneMap[1]} />
        </span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-gray-600">{date}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {withJoin && (
          <button className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
            <ExternalLink size={14} /> Join
          </button>
        )}
        <button className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
          Reschedule
        </button>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, tone = "blue", text }: QuickActionProps) {
  const tones = {
    blue: ["text-blue-700", "bg-blue-50"],
    amber: ["text-amber-700", "bg-amber-50"],
    rose: ["text-rose-700", "bg-rose-50"],
    green: ["text-green-700", "bg-green-50"],
  }[tone];

  return (
    <button className="w-full text-left">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 hover:bg-gray-100">
        <span
          className={`h-8 w-8 rounded-lg ${tones[1]} flex items-center justify-center`}
        >
          <Icon size={16} className={tones[0]} />
        </span>
        <span className="text-sm font-medium text-gray-800">{text}</span>
      </div>
    </button>
  );
}


function Activity({ icon: Icon, tone = "green", title, sub, date }: ActivityProps) {
  const tones = {
    green: ["text-green-700", "bg-green-50"],
    amber: ["text-amber-700", "bg-amber-50"],
    rose: ["text-rose-700", "bg-rose-50"],
  }[tone];

  return (
    <div className="flex items-start justify-between rounded-xl px-2 py-2">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 h-8 w-8 rounded-lg ${tones[1]} flex items-center justify-center`}
        >
          <Icon size={16} className={tones[0]} />
        </span>
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-gray-600">{sub}</p>
        </div>
      </div>
      <span className="text-sm text-gray-500">{date}</span>
    </div>
  );
}


function CheckDot() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-50">
      <CheckCircle2 size={14} className="text-green-600" />
    </span>
  );
}
