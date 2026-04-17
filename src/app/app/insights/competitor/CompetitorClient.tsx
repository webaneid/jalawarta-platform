"use client";

import { useState, useTransition } from "react";
import { addSourceToWatchlist, removeSourceFromWatchlist, searchNewsBySource } from "@/app/actions/insights-news";

type WatchlistEntry = {
  id: string;
  name: string;
  domain: string;
  createdAt: Date | null;
};

type NewsResult = {
  title: string;
  link: string;
  snippet: string;
  date: string;
  source: string;
  imageUrl?: string;
};

const TIME_RANGE_OPTIONS = [
  { label: "1 Jam Terakhir", value: "h" },
  { label: "1 Hari Terakhir", value: "d" },
  { label: "1 Minggu Terakhir", value: "w" },
  { label: "1 Bulan Terakhir", value: "m" },
  { label: "Semua Waktu", value: "all" },
];

export default function CompetitorClient({ initialWatchlist }: { initialWatchlist: WatchlistEntry[] }) {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(initialWatchlist);
  const [results, setResults] = useState<NewsResult[]>([]);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [timeRange, setTimeRange] = useState("w");
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAddSource() {
    if (!newName.trim() || !newDomain.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await addSourceToWatchlist(newName, newDomain);
      if (res.success && res.entry) {
        setWatchlist((prev) => [res.entry as WatchlistEntry, ...prev]);
        setNewName("");
        setNewDomain("");
      }
    });
  }

  function handleRemoveSource(id: string) {
    startTransition(async () => {
      await removeSourceFromWatchlist(id);
      setWatchlist((prev) => prev.filter((e) => e.id !== id));
      if (activeDomain && watchlist.find((e) => e.id === id)?.domain === activeDomain) {
        setActiveDomain(null);
        setResults([]);
      }
    });
  }

  function handleSearch(domain: string) {
    setActiveDomain(domain);
    setError(null);
    startTransition(async () => {
      try {
        const res = await searchNewsBySource(domain, query, timeRange);
        setResults(res.results || []);
      } catch (err: any) {
        setError(err.message);
        setResults([]);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Watchlist Panel */}
      <div className="lg:col-span-1 space-y-4">
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Tambah Sumber Berita</h2>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Nama (e.g. Tempo.co)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Domain (e.g. tempo.co)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddSource}
              disabled={isPending || !newName.trim() || !newDomain.trim()}
              className="w-full py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Menyimpan..." : "Tambah Sumber"}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Daftar Sumber ({watchlist.length})
          </h2>
          {watchlist.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Belum ada sumber berita.</p>
          ) : (
            <ul className="space-y-2">
              {watchlist.map((entry) => (
                <li
                  key={entry.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    activeDomain === entry.domain
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                  }`}
                  onClick={() => handleSearch(entry.domain)}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{entry.name}</p>
                    <p className="text-xs text-gray-400">{entry.domain}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveSource(entry.id); }}
                    disabled={isPending}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
                    title="Hapus"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right: Search + Results */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Filter Pencarian</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Kata kunci (opsional)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIME_RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {activeDomain && (
            <button
              onClick={() => handleSearch(activeDomain)}
              disabled={isPending}
              className="mt-2 w-full py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Mencari..." : `Cari di ${activeDomain}`}
            </button>
          )}
          {!activeDomain && (
            <p className="mt-2 text-xs text-gray-400 text-center">Pilih sumber dari daftar kiri untuk mulai mencari.</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {isPending && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {!isPending && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">{results.length} artikel ditemukan dari <strong>{activeDomain}</strong></p>
            {results.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div className="flex gap-3">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2"
                    >
                      {item.title}
                    </a>
                    {item.snippet && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{item.snippet}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      {item.source && <span>{item.source}</span>}
                      {item.date && <><span>·</span><span>{item.date}</span></>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isPending && activeDomain && results.length === 0 && !error && (
          <div className="text-center py-12 text-gray-400 text-sm">
            Tidak ada artikel ditemukan. Coba ubah rentang waktu atau kata kunci.
          </div>
        )}
      </div>
    </div>
  );
}
