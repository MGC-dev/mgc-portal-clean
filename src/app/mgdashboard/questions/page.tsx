"use client";

import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { useEffect, useState } from "react";

type SubmitState = {
  loading: boolean;
  success: boolean;
  error: string;
};

export default function AskQuestionPage() {
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("Low");
  const [details, setDetails] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ loading: false, success: false, error: "" });
  const [recentQuestions, setRecentQuestions] = useState<Array<{ id: string; title: string; date: string; status: string }>>([]);
  const [recentError, setRecentError] = useState<string>("");

  const fetchRecent = async () => {
    try {
      setRecentError("");
      const res = await fetch("/api/support/recent", { method: "GET" });
      const json = await res.json();
      if (!res.ok) {
        setRecentError(json?.error ? String(json.error) : "Recent tickets unavailable.");
        return;
      }
      const items = (json?.data || []).map((t: any) => ({
        id: t.id,
        title: t.subject as string,
        date: new Date(t.created_at).toISOString().slice(0, 10),
        status: t.status as string,
      }));
      setRecentQuestions(items);
    } catch (_) {
      setRecentError("Recent tickets unavailable.");
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  const handleSubmit = async () => {
    if (submitState.loading) return;
    setSubmitState({ loading: true, success: false, error: "" });
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, priority, details }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitState({ loading: false, success: false, error: json?.error || "Failed to submit" });
      } else {
        setSubmitState({ loading: false, success: true, error: "" });
        // Reset form after success
        setSubject("");
        setPriority("Low");
        setDetails("");
        // Refresh recent list
        fetchRecent();
      }
    } catch (e: any) {
      setSubmitState({ loading: false, success: false, error: e?.message || "Network error" });
    }
  };

  

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      {/* Sidebar - hidden on mobile */}
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
                  <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)}/>
                </div>
              </div>
            )}
      {/* Main Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Navbar */}
         <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b bg-white">
            <Navbar onMenuClick={() => setSidebarOpen(true)} />
          </header>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <h2 className="text-2xl font-bold mb-6">Support</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Submit New Question */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Submit New Question</h3>

              <label className="block text-sm font-medium">Subject</label>
              <input
                type="text"
                placeholder="Brief description of your question"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full mt-1 mb-4 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <label className="block text-sm font-medium">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full mt-1 mb-4 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>

              <label className="block text-sm font-medium">Question Details</label>
              <textarea
                placeholder="Please provide as much detail as possible..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full mt-1 mb-4 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
              {submitState.error ? (
                <div className="mb-3 text-sm text-red-600">{submitState.error}</div>
              ) : null}
              {submitState.success ? (
                <div className="mb-3 text-sm text-green-700">Your question was sent to support.</div>
              ) : null}
              <button
                onClick={handleSubmit}
                disabled={submitState.loading || !subject.trim() || !details.trim()}
                className={`w-full ${submitState.loading ? "bg-blue-400" : "bg-blue-800 hover:bg-blue-900"} text-white py-2 rounded-lg flex items-center justify-center gap-2`}
              >
                <span>{submitState.loading ? "⏳" : "🚀"}</span> {submitState.loading ? "Sending..." : "Submit Question"}
              </button>
            </div>

            {/* Recent Questions */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Questions</h3>

              <div className="space-y-3">
                {recentError ? (
                  <p className="text-sm text-red-700">{recentError}</p>
                ) : recentQuestions.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent questions yet.</p>
                ) : recentQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="flex justify-between items-center p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{q.title}</p>
                      <p className="text-sm text-gray-500">{q.date}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        q.status === "resolved"
                          ? "bg-green-300 text-black-900"
                          : q.status === "open" || q.status === "pending"
                          ? "bg-blue-300 text-gray-700"
                          : "bg-yellow-100 text-yellow-900"
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
