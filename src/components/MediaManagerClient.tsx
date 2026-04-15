"use client";

import { useState, useTransition } from "react";
import { uploadMedia } from "@/app/actions/upload";
import { deleteMediaAction, updateMediaMetadata } from "@/app/actions/media";
import { useRouter } from "next/navigation";
import { formatTenantDate } from "@/lib/dateFormatter";

type MediaItem = {
  id: string;
  url: string;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  altText?: string | null;
  caption?: string | null;
  description?: string | null;
  createdAt: Date | null;
};

export default function MediaManagerClient({
  tenantId,
  initialMedia,
  tenantConfig = {},
}: {
  tenantId: string;
  initialMedia: MediaItem[];
  tenantConfig?: any;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [metaForm, setMetaForm] = useState({ altText: "", caption: "", description: "" });
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMedia = initialMedia.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.filename.toLowerCase().includes(q) ||
      (item.altText && item.altText.toLowerCase().includes(q)) ||
      (item.caption && item.caption.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  async function handleSaveMeta() {
    if (!selectedMedia) return;
    setIsSavingMeta(true);
    const res = await updateMediaMetadata(selectedMedia.id, tenantId, metaForm);
    setIsSavingMeta(false);
    if (res.success) {
      setSelectedMedia({ ...selectedMedia, ...metaForm });
    } else {
      alert("Gagal menyimpan metadata: " + res.error);
    }
  }

  async function handleFile(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      alert("Hanya JPG, PNG, atau WEBP yang diizinkan.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran file maksimal 5MB.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadMedia(formData, tenantId);
    setIsUploading(false);

    if (result.success) {
      startTransition(() => {
        router.refresh();
      });
    } else {
      alert("Upload gagal: " + result.error);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function formatBytes(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  function handleDelete(id: string) {
    if (!confirm("Hapus file media ini secara permanen?")) return;
    startTransition(async () => {
      const res = await deleteMediaAction(id, tenantId);
      if (res.success) {
        setSelectedMedia(null);
        router.refresh();
      } else {
        alert("Gagal menghapus media: " + res.error);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      
      {/* KIRI: Gallery + Upload Area */}
      <div className="space-y-6">
        
        {/* Dropzone Upload */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center min-h-[160px] transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-900/50"
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-blue-600 font-medium text-sm">Mengunggah file...</p>
            </div>
          ) : (
            <label className="cursor-pointer flex flex-col items-center gap-2 py-6 px-12 text-center w-full">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm mb-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">Klik atau Seret Gambar ke Sini</p>
              <p className="text-xs text-gray-500">JPG, PNG, WEBP • Maks 5MB</p>
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </label>
          )}
        </div>

        {/* Gallery Grid */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Galeri ({filteredMedia.length})</h2>
            <div className="w-full sm:w-64">
               <input
                 type="text"
                 placeholder="🔍 Cari file, alt-text, atau caption..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
               />
            </div>
          </div>
          
          {filteredMedia.length === 0 ? (
             <div className="text-center py-12 text-gray-400">
               {initialMedia.length === 0 ? "Belum ada media tersimpan." : `Tidak ada yang sesuai dengan "${searchQuery}"`}
             </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredMedia.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedMedia(item);
                    setMetaForm({
                      altText: item.altText || "",
                      caption: item.caption || "",
                      description: item.description || ""
                    });
                  }}
                  className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedMedia?.id === item.id
                      ? "border-blue-600 shadow-lg shadow-blue-200 dark:shadow-blue-900"
                      : "border-transparent border-gray-200 dark:border-gray-800 hover:border-blue-400"
                  }`}
                  title={item.filename}
                >
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="w-full h-full object-cover bg-gray-100 dark:bg-gray-900"
                  />
                  {selectedMedia?.id === item.id && (
                    <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KANAN: Detail & Attributes Panel */}
      <div className="space-y-4">
        {selectedMedia ? (
           <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm sticky top-24">
             <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Rincian Berkas</h3>
             <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 mb-4 border border-gray-200 dark:border-gray-800">
                <img src={selectedMedia.url} alt={selectedMedia.filename} className="w-full h-full object-contain" />
             </div>
             
             <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs font-medium">Nama File</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100 break-all">{selectedMedia.filename}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-gray-500 text-xs font-medium">Ukuran</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{formatBytes(selectedMedia.sizeBytes)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs font-medium">Format</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{selectedMedia.mimeType?.split("/")[1]?.toUpperCase() || "N/A"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-medium">Diunggah pada</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {formatTenantDate(selectedMedia.createdAt, tenantConfig)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-medium mb-1">URL Berkas</p>
                  <input readOnly value={selectedMedia.url} className="w-full text-xs font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded px-2 py-1.5 focus:outline-none" />
                </div>
                
                {/* Meta Form */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                  <div>
                    <label className="block text-gray-500 text-xs font-medium mb-1">Teks Alternatif (Alt Text)</label>
                    <input value={metaForm.altText} onChange={e => setMetaForm({...metaForm, altText: e.target.value})} className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Gambar tentang..." />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs font-medium mb-1">Keterangan (Caption)</label>
                    <input value={metaForm.caption} onChange={e => setMetaForm({...metaForm, caption: e.target.value})} className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Keterangan singkat di bawah gambar..." />
                  </div>
                  <div>
                    <label className="block text-gray-500 text-xs font-medium mb-1">Deskripsi</label>
                    <textarea value={metaForm.description} onChange={e => setMetaForm({...metaForm, description: e.target.value})} rows={3} className="w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Penjelasan detail jika diperlukan..."></textarea>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button onClick={handleSaveMeta} disabled={isSavingMeta} className="text-xs bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white font-medium py-1.5 px-4 rounded-lg disabled:opacity-50 transition-colors">
                      {isSavingMeta ? "Menyimpan..." : "Simpan Meta"}
                    </button>
                  </div>
                </div>
             </div>

             <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
               <button 
                 onClick={() => handleDelete(selectedMedia.id)}
                 disabled={isPending}
                 className="text-red-600 hover:text-red-700 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
               >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 Hapus Permanen
               </button>
             </div>
           </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-dashed border-gray-300 dark:border-gray-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-[320px] sticky top-24">
             <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
             </svg>
             <p className="text-gray-500 font-medium">Klik pada gambar di galeri untuk melihat rincian.</p>
          </div>
        )}
      </div>
    </div>
  );
}
