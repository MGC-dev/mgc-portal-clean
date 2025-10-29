export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900/80">
      <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-lg bg-white/90 shadow-xl">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-gray-800">Loading…</span>
      </div>
    </div>
  );
}