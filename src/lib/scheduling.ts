import type { Appointment } from "@/lib/appointments";

// Format a Date to a human-friendly time label like "09:30 AM"
function formatTimeLabel(date: Date): string {
  const hours24 = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const paddedMinutes = minutes.toString().padStart(2, "0");
  return `${hours12.toString().padStart(2, "0")}:${paddedMinutes} ${ampm}`;
}

export interface WorkHours {
  startHour: number; // in 24h local time, e.g., 9 for 9AM
  endHour: number;   // in 24h local time, e.g., 17 for 5PM
}

export function generateTimeSlots(
  date: Date,
  intervalMinutes: number = 30,
  workHours: WorkHours = { startHour: 9, endHour: 17 }
): { label: string; start: Date }[] {
  const slots: { label: string; start: Date }[] = [];
  const startOfDay = new Date(date);
  startOfDay.setHours(workHours.startHour, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(workHours.endHour, 0, 0, 0);

  const cursor = new Date(startOfDay);
  while (cursor < endOfDay) {
    slots.push({ label: formatTimeLabel(cursor), start: new Date(cursor) });
    cursor.setMinutes(cursor.getMinutes() + intervalMinutes);
  }

  return slots;
}

export function doesOverlap(
  slotStart: Date,
  durationMinutes: number,
  appointmentStartISO: string,
  appointmentEndISO: string,
  bufferMinutes: number = 0
): boolean {
  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes + bufferMinutes);

  // Apply buffer before the slot as well to avoid tight back-to-back bookings
  const slotStartBuffered = new Date(slotStart);
  slotStartBuffered.setMinutes(slotStartBuffered.getMinutes() - bufferMinutes);

  const aptStart = new Date(appointmentStartISO);
  const aptEnd = new Date(appointmentEndISO);

  // overlap if slotStartBuffered < aptEnd && slotEnd > aptStart
  return slotStartBuffered < aptEnd && slotEnd > aptStart;
}

export function isSlotBooked(
  slotStart: Date,
  durationMinutes: number,
  appointments: Appointment[],
  bufferMinutes: number = 15
): boolean {
  return appointments.some((apt) =>
    doesOverlap(slotStart, durationMinutes, apt.start_time, apt.end_time, bufferMinutes)
  );
}