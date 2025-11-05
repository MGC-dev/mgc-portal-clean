"use client";

export default function AppLoading() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <div className="flex items-center gap-4">
          <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-20 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="h-40 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-40 animate-pulse rounded-lg bg-gray-200" />
          </div>
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}