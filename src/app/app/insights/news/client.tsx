"use client";

import { useState } from "react";
import { runNewsInsightSearch, saveAsInsight } from "@/app/actions/insights-news";
import { scrapeAndGenerateArticle } from "@/app/actions/insights-scrape";

export default function NewsSearchClient({ history }: { history: any[] }) {
  const [query, setQuery] = useState("");
  const [timeRange, setTimeRange] = useState("d");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [generatingUrl, setGeneratingUrl] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    setErrorMsg("");
    setResults([]);
    try {
      const res = await runNewsInsightSearch(query, timeRange);
      if (res.success) {
        setResults(res.results);
      } else {
        setErrorMsg("Failed to search news.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveInsight(title: string, url: string) {
    const btn = document.getElementById(`btn-${url}`);
    if (btn) btn.innerText = "Saving...";
    try {
      await saveAsInsight(title, url);
      if (btn) {
        btn.innerText = "Saved";
        btn.setAttribute("disabled", "true");
        btn.classList.add("opacity-50");
      }
    } catch (err: any) {
      alert(err.message);
      if (btn) btn.innerText = "Save Insight";
    }
  }

  async function handleGenerateArticle(url: string, title: string) {
    setGeneratingUrl(url);
    setErrorMsg("");
    try {
      const res = await scrapeAndGenerateArticle({ url, title });
      if (!res.success) {
        setErrorMsg(res.error || "Gagal generate artikel.");
        setGeneratingUrl(null);
        return;
      }
      sessionStorage.setItem("insight_ai_draft", res.html);
      sessionStorage.setItem("insight_ai_title", res.title);
      window.location.href = "/posts/editor";
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal membuat artikel.");
      setGeneratingUrl(null);
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Topik berita (contoh: Harga Emas)"
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="all">Kapanpun</option>
          <option value="d">24 Jam Terakhir</option>
          <option value="w">1 Minggu Terakhir</option>
          <option value="m">1 Bulan Terakhir</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "Mencari..." : "Search"}
        </button>
      </form>

      {errorMsg && (
        <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
          {errorMsg}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Hasil Pencarian</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((item, i) => (
              <div key={i} className="p-4 border border-gray-200 dark:border-gray-800 rounded-lg flex flex-col justify-between">
                <div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline line-clamp-2"
                  >
                    {item.title}
                  </a>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-3">{item.snippet}</p>
                  <p className="text-xs text-gray-400 mt-2">{item.publishDate || "Tanggal tidak diketahui"}</p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleGenerateArticle(item.url ?? "", item.title ?? "")}
                    disabled={generatingUrl === item.url}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {generatingUrl === item.url ? (
                      <>
                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Memproses...
                      </>
                    ) : (
                      "Buat Artikel"
                    )}
                  </button>
                  <button
                    id={`btn-${item.url}`}
                    onClick={() => handleSaveInsight(item.title, item.url)}
                    className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 font-medium px-3 py-1.5 rounded text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Save Insight
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
