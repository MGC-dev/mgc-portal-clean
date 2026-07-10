"use client";

import { FileText, Eye, Download } from "lucide-react";

const recaps = [
  {
    id: 1,
    title: "Session Recap - 1/18/2024",
    date: "2024-01-18",
    actions: 3,
    description:
      "Discussed Q4 performance metrics and identified key areas for improvement in customer acquisition.",
  },
];

export default function SessionRecapsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h2 className="text-xl sm:text-2xl font-bold mb-6">Session Recaps</h2>

          {/* Outer Card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 sm:p-8">
            <h3 className="text-md sm:text-lg font-semibold mb-4">
              Recent Sessions
            </h3>

            <div className="space-y-4">
              {recaps.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-5 gap-4"
                >
                  {/* Left: icon + info */}
                  <div className="flex items-start gap-3">
                    <FileText size={28} className="text-gray-500 mt-1" />
                    <div>
                      <h4 className="font-semibold text-base sm:text-lg">
                        {r.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mt-1">
                        <span>Date: {new Date(r.date).toLocaleDateString()}</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">
                          {r.actions} Action Items
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{r.description}</p>
                    </div>
                  </div>

                  {/* Right: buttons */}
                  <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] font-medium transition-all text-sm w-full sm:w-auto justify-center">
                      <Eye size={16} /> View
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed] font-medium transition-all text-sm w-full sm:w-auto justify-center">
                      <Download size={16} /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
    </div>
  );
}
