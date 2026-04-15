"use client";

import { useState } from "react";
import { importWordPressAction } from "@/app/actions/tools";
import { useRouter } from "next/navigation";

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setError(null);
    setResults(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        
        // We'll use a hardcoded tenantId for now, in real scenario it's from session
        const res = await importWordPressAction(content, "default-tenant-id");

        if (res.success) {
          setResults(res.results);
        } else {
          setError(res.error || "Gagal mengimpor data.");
        }
        setIsImporting(false);
      };
      reader.readAsText(file);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat membaca file.");
      setIsImporting(false);
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
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Import WordPress</h1>
          <p className="text-gray-500 dark:text-gray-400">Unggah file XML WXR Anda untuk memindahkan konten.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm space-y-8">
        {!results ? (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto text-blue-600">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </div>
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100">Pilih file XML WordPress (WXR)</p>
                <p className="text-sm text-gray-500 mt-1">Hanya file berformat .xml yang didukung.</p>
              </div>
              <input 
                type="file" 
                accept=".xml" 
                onChange={handleFileChange}
                className="hidden" 
                id="file-upload"
              />
              <label 
                htmlFor="file-upload"
                className="inline-flex px-6 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                {file ? file.name : "Pilih File"}
              </label>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium animate-in shake-in-1">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={!file || isImporting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3"
            >
              {isImporting ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sedang Mengimpor...
                </>
              ) : (
                "Mulai Impor Sekarang"
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="text-center p-6 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30">
               <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
               </div>
               <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Impor Selesai!</h3>
               <p className="text-gray-500 text-sm mt-1">Data Anda telah berhasil dipetakan ke sistem Jala Warta.</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
               {[
                 { label: "Pos", value: results.posts, color: "blue" },
                 { label: "Laman", value: results.pages, color: "purple" },
                 { label: "Media", value: results.media, color: "green" },
               ].map((res, i) => (
                 <div key={i} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                    <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{res.value}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{res.label}</p>
                 </div>
               ))}
            </div>

            {results.errors.length > 0 && (
              <div className="space-y-2">
                 <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Log Kesalahan ({results.errors.length})</p>
                 <div className="max-h-40 overflow-y-auto bg-gray-100 dark:bg-black rounded-xl p-4 text-[11px] font-mono text-red-500 space-y-1">
                    {results.errors.map((err: string, i: number) => (
                      <div key={i}>• {err}</div>
                    ))}
                 </div>
              </div>
            )}

            <div className="flex gap-4">
              <button 
                onClick={() => setResults(null)}
                className="flex-1 py-3 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors"
              >
                Impor File Lain
              </button>
              <button 
                onClick={() => router.push("/posts")}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
              >
                Lihat Artikel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
         <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">Panduan Import:</h4>
         <ul className="text-xs text-gray-500 space-y-1.5 list-disc pl-5">
            <li>Gunakan menu <strong>Tools → Export</strong> di dashboard WordPress lama Anda.</li>
            <li>Pilih "All Content" saat mengekspor dari WordPress.</li>
            <li>Pastikan situs lama Anda masih aktif agar sistem dapat mengunduh gambar secara otomatis.</li>
            <li>Impor media dalam jumlah besar mungkin memerlukan waktu beberapa menit.</li>
         </ul>
      </div>
    </div>
  );
}
