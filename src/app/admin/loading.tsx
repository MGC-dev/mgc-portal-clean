"use client";

export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-6xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-24 rounded-full bg-[#264f5e]/15" />
        <div className="h-7 w-48 rounded-xl bg-[#264f5e]/10" />
        <div className="h-4 w-64 rounded-full bg-gray-100" />
      </div>

      {/* Welcome card skeleton */}
      <div className="rounded-2xl border border-[#e8eef1] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#264f5e]/20 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-48 rounded-lg bg-gray-100" />
            <div className="h-4 w-72 rounded-lg bg-gray-100" />
            <div className="flex gap-2 mt-3">
              <div className="h-5 w-20 rounded-full bg-[#264f5e]/10" />
              <div className="h-5 w-16 rounded-full bg-emerald-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions skeleton */}
      <div>
        <div className="h-4 w-32 rounded-lg bg-gray-100 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-2xl border border-[#e8eef1] bg-white p-4"
            >
              <div className="h-10 w-10 rounded-xl bg-[#264f5e]/10 shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-28 rounded-lg bg-gray-100" />
                <div className="h-3 w-36 rounded-full bg-gray-50" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-[#e8eef1] bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8eef1]">
          <div className="space-y-1.5">
            <div className="h-4 w-36 rounded-lg bg-gray-100" />
            <div className="h-3 w-52 rounded-full bg-gray-50" />
          </div>
          <div className="h-8 w-28 rounded-xl bg-[#264f5e]/10" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl bg-gray-50 px-4 py-3"
            >
              <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 rounded-lg bg-gray-200" />
                <div className="h-3 w-48 rounded-full bg-gray-100" />
              </div>
              <div className="h-5 w-16 rounded-full bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}