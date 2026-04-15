"use client";

import { useState } from "react";
import { dispatchInsightGeneration } from "@/app/actions/insights-generate";

export default function InsightsListClient({ insights }: { insights: any[] }) {
  const [loadingObj, setLoadingObj] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState("");

  async function handleGenerate(id: string) {
    setLoadingObj({ ...loadingObj, [id]: true });
    setErrorMsg("");
    try {
      const res = await dispatchInsightGeneration(id);
      if (!res.success) {
        setErrorMsg(res.error || "Gagal membuat artikel");
      } else {
        // Redirect to editor
        window.location.href = `/posts/editor?id=${res.postId}`;
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Unknown error");
    } finally {
      setLoadingObj({ ...loadingObj, [id]: false });
    }
  }

  if (insights.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Belum ada insight yang disimpan. Lakukan riset melalui tab News Search atau Social Trends.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMsg && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm mb-4">{errorMsg}</div>}
      
      {insights.map(item => (
        <div key={item.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border border-gray-200 dark:border-gray-800 rounded-lg">
          <div className="mb-4 md:mb-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{item.topic}</h3>
            <div className="text-xs text-gray-500 mt-1 flex gap-3">
              <span>Source: <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Link</a></span>
              <span>Status: {item.status}</span>
              <span>Articles: {item.articleCount}</span>
            </div>
          </div>
          <div>
            <button 
              onClick={() => handleGenerate(item.id)}
              disabled={loadingObj[item.id]}
              className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-all ${loadingObj[item.id] ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {loadingObj[item.id] ? "Menulis Artikel..." : "Jadikan Artikel"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
