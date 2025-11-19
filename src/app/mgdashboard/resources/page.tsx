"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar";
import Navbar from "@/components/navbar";
import { Download, FileText, Play } from "lucide-react";
import type { Resource } from "@/lib/resources";

// --- Types ---
// --- Dynamic Data from Supabase ---
function groupResources(resources: Resource[]) {
  const docs = resources.filter((r) => (r.category || "document") === "document");
  const vids = resources.filter((r) => r.category === "video");
  return { docs, vids };
}

export default function ResourceLibraryPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"documents" | "videos">("documents");
  const [openVideo, setOpenVideo] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Resource | null>(null);
  const [openDoc, setOpenDoc] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Resource | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/resources", { headers: { accept: "application/json" } });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load resources");
        setResources((json?.resources || []) as Resource[]);
      } catch (e: any) {
        setError(e?.message || "Failed to load resources");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { docs, vids } = groupResources(resources);
  const filtered = activeTab === "documents" ? docs : vids;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:block">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-50 w-64 bg-white shadow-lg">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b bg-white">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
        </header>

        <main className="flex-1 p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-6">📚 Resource Library</h2>

          {/* Tabs */}
          <div className="mb-6 flex w-full sm:w-fit justify-center bg-gray-100 p-1 rounded-2xl shadow-inner">
            <button
              onClick={() => setActiveTab("documents")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "documents"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-700 hover:text-indigo-600"
              }`}
            >
              📄 Documents
            </button>
            <button
              onClick={() => setActiveTab("videos")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "videos"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-700 hover:text-indigo-600"
              }`}
            >
              🎬 Videos
            </button>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Documents */}
            {activeTab === "documents" && !loading && filtered.length === 0 && (
              <div className="text-gray-600">No documents available yet.</div>
            )}
            {activeTab === "documents" &&
              (filtered as Resource[]).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedDoc(doc);
                    setOpenDoc(true);
                  }}
                  className="bg-white rounded-2xl shadow-md p-4 sm:p-6 flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <FileText size={28} className="text-black-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg">{doc.title}</h3>
                      <p className="text-gray-600 text-sm mt-3">{doc.description}</p>
                    </div>
                  </div>
                  <button className="mt-4 self-start flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-black-700 px-3 sm:px-4 py-2 rounded-lg transition text-sm">
                    <Download size={16} /> Download
                  </button>
                </div>
              ))}

            {/* Videos */}
            {activeTab === "videos" && !loading && filtered.length === 0 && (
              <div className="text-gray-600">No videos available yet.</div>
            )}
            {activeTab === "videos" &&
              (filtered as Resource[]).map((video) => (
                <div
                  key={video.id}
                  onClick={() => {
                    setSelectedVideo(video);
                    setOpenVideo(true);
                  }}
                  className="bg-white rounded-2xl shadow-md p-4 sm:p-6 flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <Play size={28} className="text-pink-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg">{video.title}</h3>
                      <p className="text-gray-600 text-sm mt-2">{video.description}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </main>
      </div>

      {/* Video Modal */}
      {openVideo && selectedVideo && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-[#111827] text-white rounded-xl shadow-2xl w-full max-w-4xl relative overflow-hidden mx-2 sm:mx-0">
            <button
              onClick={() => setOpenVideo(false)}
              className="absolute top-4 right-4 text-gray-300 hover:text-white text-2xl"
            >
              ×
            </button>
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xs sm:text-sm font-semibold text-gray-400">
                Course Preview
              </h2>
              <h1 className="text-base sm:text-lg font-bold">{selectedVideo.title}</h1>
            </div>
            <div className="relative bg-black flex items-center justify-center">
              <video
                key={selectedVideo.id}
                controls
                autoPlay
                className="w-full h-[50vh] sm:h-72 object-contain bg-black"
              >
                <source src={selectedVideo.file_url || ""} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}

     {/* Document Modal */}
{openDoc && selectedDoc && (
  <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
    {/* For Desktop (sm and above) */}
    <div className="hidden sm:block bg-white text-black rounded-xl shadow-2xl w-full max-w-6xl relative overflow-hidden mx-2 sm:mx-0">
      <button
        onClick={() => setOpenDoc(false)}
        className="absolute top-4 right-4 text-gray-500 hover:text-black text-2xl"
      >
        ×
      </button>
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xs sm:text-sm font-semibold text-gray-500">
          Document Preview
        </h2>
        <h1 className="text-base sm:text-lg font-bold">{selectedDoc.title}</h1>
      </div>
      <div className="p-4">
        {selectedDoc.file_url ? (
          <iframe
            src={selectedDoc.file_url}
            className="w-full h-[80vh] rounded-md border"
          />
        ) : (
          <p className="text-gray-600 text-sm">
            No preview available for this document.
          </p>
        )}
      </div>
    </div>

    {/* For Mobile (fullscreen) */}
      <div className="sm:hidden w-full h-full bg-white text-black z-50 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h1 className="text-sm font-bold truncate">{selectedDoc.title}</h1>
          <button
            onClick={() => setOpenDoc(false)}
            className="text-gray-500 hover:text-black text-2xl"
          >
            ×
          </button>
        </div>
        <div className="flex-1">
          {selectedDoc.file_url ? (
            <iframe
              src={selectedDoc.file_url}
              className="w-full h-full"
            />
          ) : (
            <p className="text-gray-600 text-sm p-4">
              No preview available for this document.
               <a
                href={selectedDoc.file_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 underline"
              >
                Open in new tab
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )}

    </div>
  );
}
