"use client";

import CalendlyWidget from "@/components/calendly-widget";

// Relax props typing to satisfy Next.js page type validation
export default function BookEventPage({ params }: any) {
  const { handle, event } = params;
  const url = `https://calendly.com/${decodeURIComponent(handle)}/${decodeURIComponent(event)}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Book Time With {decodeURIComponent(handle)}</h1>
      <p className="text-gray-600 mb-6">Select a date and time below.</p>
      <div className="rounded-lg border bg-white">
        <CalendlyWidget mode="inline" url={url} inlineHeight={760} className="w-full" />
      </div>
    </div>
  );
}