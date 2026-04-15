"use client";

import { useState } from "react";
import { exportWordPressAction } from "@/app/actions/tools";
import { useRouter } from "next/navigation";

export default function ExportPage() {
  const router = useRouter();
  const [exportType, setExportType] = useState<"all" | "post" | "page" | "media">("all");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      // In real scenario, tenantId is from session
      const res = await exportWordPressAction("default-tenant-id", { type: exportType });

      if (res.success && res.xml) {
        // Trigger download
        const blob = new Blob([res.xml], { type: "text/xml" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `jalawarta-export-${new Date().toISOString().slice(0, 10)}.xml`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError(res.error || "Gagal mengekspor data.");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat proses ekspor.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Ekspor Data</h1>
          <p className="text-gray-500 dark:text-gray-400">Ekspor konten Jala Warta ke dalam format XML WordPress (WXR).</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm space-y-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Pilih Konten untuk Diekspor:</h3>
            
            <div className="space-y-3">
              {[
                { id: "all", label: "Semua Konten", desc: "Mencakup Artikel, Laman, Kategori, dan Media." },
                { id: "post", label: "Hanya Artikel", desc: "Hanya mengekspor artikel berita (Posts)." },
                { id: "page", label: "Hanya Laman", desc: "Hanya mengekspor halaman statis (Pages)." },
                { id: "media", label: "Media Library", desc: "Mengekspor daftar metadata media library Anda." },
              ].map((opt) => (
                <label 
                  key={opt.id}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${exportType === opt.id ? "bg-purple-50 border-purple-200 ring-2 ring-purple-100 dark:bg-purple-900/10 dark:border-purple-800" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-purple-200 dark:hover:border-purple-800"}`}
                >
                  <input 
                    type="radio"
                    name="exportType"
                    checked={exportType === opt.id}
                    onChange={() => setExportType(opt.id as any)}
                    className="mt-1 w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3"
          >
            {isExporting ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Mempersiapkan File...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Unduh File Ekspor
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-6 flex gap-4">
         <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-purple-600 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
         </div>
         <div className="space-y-1">
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">Informasi Penting</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              File hasil ekspor ini menggunakan standar format WXR. Anda dapat menggunakan file ini untuk memindahkan konten ke instalasi WordPress lain atau CMS lain yang mendukung import WordPress. Data file fisik media library Anda tidak disertakan dalam XML, melainkan berupa tautan URL yang menunjuk ke server Jala Warta saat ini.
            </p>
         </div>
      </div>
    </div>
  );
}
