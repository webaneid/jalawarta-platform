"use client";

import { useState } from "react";
import {
  addSourceToWatchlist,
  removeSourceFromWatchlist,
  searchNewsBySource,
  saveAsInsight,
} from "@/app/actions/insights-news";

type WatchlistEntry = { id: string; name: string; domain: string };
type NewsResult = { title: string; url: string; snippet?: string | null; publishDate?: string | null };
type HistoryItem = { id: string; sourceDomain?: string | null; theme?: string | null; timeRange?: string | null; createdAt: Date | null; results: NewsResult[] };

const TIME_OPTIONS = [
  { label: "1 Jam Terakhir", value: "h" },
  { label: "24 Jam Terakhir", value: "d" },
  { label: "1 Minggu Terakhir", value: "w" },
  { label: "1 Bulan Terakhir", value: "m" },
  { label: "Kapanpun", value: "all" },
];

export default function CompetitorClient({
  initialWatchlist,
  initialHistory,
}: {
  initialWatchlist: WatchlistEntry[];
  initialHistory: HistoryItem[];
}) {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(initialWatchlist ?? []);
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory ?? []);

  const [source, setSource] = useState("");
  const [keyword, setKeyword] = useState("");
  const [timeRange, setTimeRange] = useState("w");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NewsResult[]>([]);
  const [activeSearch, setActiveSearch] = useState<{ domain: string; theme: string; timeRange: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const domain = source.trim().replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
    if (!domain) return;

    setLoading(true);
    setErrorMsg("");
    setResults([]);
    setActiveHistoryId(null);

    try {
      const res = await searchNewsBySource(domain, keyword, timeRange);
      setResults(res.results || []);
      setActiveSearch({ domain, theme: keyword, timeRange });

      // Auto-save domain to watchlist if not already there
      if (!watchlist.some((w) => w.domain === domain)) {
        const saved = await addSourceToWatchlist(domain, domain);
        if (saved.success && saved.entry) {
          setWatchlist((prev) => [saved.entry as WatchlistEntry, ...prev]);
        }
      }

      // Prepend to local history
      const newEntry: HistoryItem = {
        id: crypto.randomUUID(),
        sourceDomain: domain,
        theme: keyword || null,
        timeRange,
        createdAt: new Date(),
        results: res.results || [],
      };
      setHistory((prev) => [newEntry, ...prev].slice(0, 20));
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveSource(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await removeSourceFromWatchlist(id);
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
  }

  async function handleSaveInsight(title: string, url: string) {
    const btn = document.getElementById(`cbtn-${url}`);
    if (btn) btn.innerText = "Menyimpan...";
    try {
      await saveAsInsight(title, url);
      if (btn) {
        btn.innerText = "Tersimpan";
        btn.setAttribute("disabled", "true");
        btn.classList.add("opacity-50");
      }
    } catch (err: any) {
      alert(err.message);
      if (btn) btn.innerText = "Save Insight";
    }
  }

  function loadFromHistory(item: HistoryItem) {
    setResults(item.results);
    setActiveHistoryId(item.id);
    setActiveSearch({ domain: item.sourceDomain ?? "", theme: item.theme ?? "", timeRange: item.timeRange ?? "w" });
    setSource(item.sourceDomain ?? "");
    setKeyword(item.theme ?? "");
    setTimeRange(item.timeRange ?? "w");
  }

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              placeholder="Sumber berita (contoh: antaranews.com)"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
            {/* Watchlist suggestions */}
            {watchlist.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {watchlist.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setSource(w.domain)}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      source === w.domain
                        ? "bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900/40 dark:border-blue-600 dark:text-blue-300"
                        : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {w.domain}
                    <span
                      onClick={(e) => handleRemoveSource(w.id, e)}
                      className="text-gray-400 hover:text-red-500 ml-0.5 cursor-pointer"
                    >×</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Kata kunci (opsional)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            {TIME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || !source.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Mencari..." : "Cari"}
          </button>
        </div>

      </form>

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md text-sm">
          {errorMsg}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            Hasil dari <span className="text-blue-600 dark:text-blue-400">{activeSearch?.domain}</span>
            {activeSearch?.theme && <> — "{activeSearch.theme}"</>}
          </h3>
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
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-right">
                  <button
                    id={`cbtn-${item.url}`}
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

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Riwayat Pencarian</h3>
          <div className="space-y-2">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => loadFromHistory(item)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                  activeHistoryId === item.id
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.sourceDomain}</span>
                    {item.theme && (
                      <span className="ml-2 text-xs text-gray-500">— {item.theme}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">{item.results.length} artikel</span>
                    <span className="text-xs text-gray-400">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString("id-ID") : ""}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
