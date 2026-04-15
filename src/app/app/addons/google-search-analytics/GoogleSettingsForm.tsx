"use client";

import { useState } from "react";
import { updateAddonConfigAction } from "@/app/actions/addons";
import { useRouter } from "next/navigation";

export default function GoogleSettingsForm({ 
    tenantId, 
    initialConfig 
}: { 
    tenantId: string; 
    initialConfig: any 
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const config = {
      gaMeasurementId: formData.get("gaMeasurementId") as string,
      gscVerificationId: formData.get("gscVerificationId") as string,
    };

    const res = await updateAddonConfigAction(tenantId, "google-search-analytics", config);

    if (res.success) {
      setMessage({ type: "success", text: "Konfigurasi Google berhasil disimpan!" });
      router.refresh();
    } else {
      setMessage({ type: "error", text: res.error || "Gagal menyimpan konfigurasi." });
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-sm space-y-8">
        
        {/* Google Analytics 4 Section */}
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-xl flex items-center justify-center font-bold">
                    GA
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Google Analytics 4</h3>
                    <p className="text-[10px] text-gray-500">Monitor trafik dan perilaku pembaca.</p>
                </div>
            </div>
            
            <div className="space-y-2 pl-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Measurement ID</label>
                <input
                    name="gaMeasurementId"
                    defaultValue={initialConfig.gaMeasurementId || initialConfig.measurementId}
                    placeholder="G-XXXXXXXXXX"
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                />
            </div>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-800" />

        {/* Search Console Section */}
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                    SC
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Google Search Console</h3>
                    <p className="text-[10px] text-gray-500">Verifikasi kepemilikan situs untuk SEO.</p>
                </div>
            </div>
            
            <div className="space-y-2 pl-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Verification Tag ID</label>
                <input
                    name="gscVerificationId"
                    defaultValue={initialConfig.gscVerificationId}
                    placeholder="Masukkan kode unik verifikasi..."
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl px-5 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
                <p className="text-[10px] text-gray-400 italic">
                    * Ambil hanya kode di dalam <code>content="..."</code> pada tag meta verifikasi Google.
                </p>
            </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-sm font-bold border flex items-center gap-3 ${
          message.type === "success" 
            ? "bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/10 dark:border-emerald-900 dark:text-emerald-400" 
            : "bg-red-50 border-red-100 text-red-800 dark:bg-red-900/10 dark:border-red-900 dark:text-red-400"
        }`}>
          {message.type === "success" ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          )}
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          disabled={loading}
          type="submit"
          className="bg-gray-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold py-3.5 px-10 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            "Simpan Konfigurasi"
          )}
        </button>
      </div>
    </form>
  );
}
