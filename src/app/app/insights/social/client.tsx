"use client";

import { useState } from "react";
import { runSocialTrendSearch, createContentStrategy } from "@/app/actions/insights-social";
import { saveAsInsight } from "@/app/actions/insights-news"; // Reusing basic saving logic for 1:1

export default function SocialSearchClient({ history }: { history: any[] }) {
  const [keyword, setKeyword] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [searchId, setSearchId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword) return;
    
    setLoading(true);
    setErrorMsg("");
    setResults([]);
    setSelectedTopics([]);

    try {
      const res = await runSocialTrendSearch(keyword, platform);
      if (res.success) {
        setResults(res.results);
        setSearchId(res.searchId);
      } else {
        setErrorMsg("Failed to fetch trends.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function toggleTopic(url: string) {
    setSelectedTopics(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
  }

  async function handleSaveSingle(title: string, url: string) {
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

  async function handleCreateRoundup() {
    if (selectedTopics.length === 0) return alert("Pilih minimal 1 topik!");
    
    // Ini menghemat token API karena hanya membuat 1 artikel Roundup dari multiple sources
    const titles = results.filter(r => selectedTopics.includes(r.link)).map(r => r.content).join(", ");
    
    try {
      // Simpan strategi massal (Roundup) di DB 
      const res = await createContentStrategy(searchId, "roundup", selectedTopics);
      if (res.success) {
        alert("Content Strategy (Roundup) berhasil dibuat. Fitur pemrosesan massal sedang dalam tahap integrasi Cronjob!");
      }
    } catch(err: any) {
      alert(err.message);
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-2 mb-8">
        <input 
          type="text" 
          placeholder="Kata kunci viral (contoh: Lebaran 2024)" 
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select 
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option value="tiktok">TikTok</option>
          <option value="twitter" disabled>X (Twitter) - Coming Soon</option>
        </select>
        <button 
          type="submit" 
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "Mencari Tren..." : "Search Trend"}
        </button>
      </form>

      {errorMsg && <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">{errorMsg}</div>}

      {results.length > 0 && (
        <div className="space-y-4 border-t border-gray-200 dark:border-gray-800 pt-6">
          <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
            <div>
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">Content Strategy Generator</h3>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">Buat artikel rangkuman (Roundup) sekaligus dari video yang dipilih.</p>
            </div>
            <button 
              onClick={handleCreateRoundup}
              disabled={selectedTopics.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm transition-all disabled:opacity-50"
            >
              Buat Artikel Roundup ({selectedTopics.length})
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {results.map((item, i) => (
              <div key={i} className={`p-4 border rounded-lg flex flex-col justify-between transition-all ${
                selectedTopics.includes(item.link) ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-sm" : "border-gray-200 dark:border-gray-800"
              }`}>
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    className="mt-1.5 h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                    checked={selectedTopics.includes(item.link)}
                    onChange={() => toggleTopic(item.link)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-3 mb-2">{item.content}</p>
                    <div className="text-xs text-gray-500">
                      Author: <span className="font-semibold">@{item.author}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Engagement: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{item.engagementTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <a href={item.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                    Lihat Video
                  </a>
                  <button 
                    id={`btn-${item.link}`}
                    onClick={() => handleSaveSingle(item.content, item.link)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 font-medium px-3 py-1.5 rounded text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Save As Article 1:1
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
