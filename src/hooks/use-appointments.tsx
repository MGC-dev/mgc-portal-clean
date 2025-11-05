"use client";

import { useState, useEffect } from "react";
import { getUserAppointments, type Appointment } from "@/lib/appointments";
import { createClient } from "@/lib/supabase";

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await getUserAppointments();

      if (error) {
        setError(error);
      } else {
        let base = data || [];

        // Try to merge Calendly events for the current user's email (optional)
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const email = user?.email;
          if (email) {
            const resp = await fetch(`/api/calendly/events?email=${encodeURIComponent(email)}`);
            if (resp.ok) {
              const json = await resp.json();
              const calEvents: Appointment[] = json?.data || [];

              // Deduplicate by start_time+title combo
              const byKey = new Map<string, Appointment>();
              [...base, ...calEvents].forEach((apt) => {
                const key = `${apt.start_time}|${apt.title}`;
                if (!byKey.has(key)) byKey.set(key, apt);
              });
              base = Array.from(byKey.values());
            }
          }
        } catch (mergeErr) {
          // Ignore Calendly merge errors; keep Supabase data
        }

        setAppointments(base);
      }
    } catch (err) {
      setError("Failed to fetch appointments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const upcomingAppointments = appointments.filter((apt) => {
    const appointmentDate = new Date(apt.start_time);
    const now = new Date();
    return appointmentDate >= now && apt.status === "scheduled";
  }).sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  const todaysAppointments = appointments.filter((apt) => {
    const appointmentDate = new Date(apt.start_time);
    const today = new Date();

    return (
      appointmentDate.toDateString() === today.toDateString() &&
      apt.status === "scheduled"
    );
  });

  return {
    appointments,
    upcomingAppointments,
    todaysAppointments,
    loading,
    error,
    refetch: fetchAppointments,
  };
}
