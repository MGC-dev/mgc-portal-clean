export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 px-6 py-4 rounded-lg bg-white shadow">
        <div className="h-6 w-6 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-gray-800">Loading admin…</span>
      </div>
    </div>
  );
}