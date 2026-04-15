"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { uploadMedia } from "@/app/actions/upload";
import { getMedia, updateMediaMetadata } from "@/app/actions/media";
import { getActivePlatformImageProviders } from "@/app/actions/ai-image";
import { getTenantAddons } from "@/app/actions/addons";
import AiImageTab from "./addons/ai-image/AiImageTab";

type MediaItem = {
  id: string;
  url: string;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  altText?: string | null;
  caption?: string | null;
  description?: string | null;
  createdAt?: string | Date | null;
};

type MediaLibraryProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  tenantId?: string;
  articleTitle?: string;
  isAiGeneratorEnabled?: boolean;
};

export default function MediaLibrary({
  isOpen,
  onClose,
  onSelect,
  tenantId = "demo-tenant",
  articleTitle,
  isAiGeneratorEnabled = true, // Idealnya ditarik dari vault, kita aktifkan by default di MVP ini
}: MediaLibraryProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "gallery" | "generate">("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [galleryItems, setGalleryItems] = useState<MediaItem[]>([]);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [activeImageProviders, setActiveImageProviders] = useState<{id: string, name: string}[]>([]);

  const loadGallery = useCallback(async () => {
    setIsLoadingGallery(true);
    try {
      const items = await getMedia(tenantId);
      setGalleryItems(items as MediaItem[]);
    } finally {
      setIsLoadingGallery(false);
    }
  }, [tenantId]);

  // Fetch galeri dan active image providers saat media library dibuka
  useEffect(() => {
    if (!isOpen) return;

    // Load active providers, but verify tenant plugin "ai-image-generator" status first
    if (isAiGeneratorEnabled) {
       getTenantAddons(tenantId).then(res => {
         if (res.success) {
           const addon = res.addons?.find((a: any) => a.id === "ai-image-generator");
           // Only show Generate tab if plugin is both ACTIVE and allowed by the tenant's package
           if (addon?.status === "ACTIVE" && addon?.isAllowedByPackage) {
             getActivePlatformImageProviders()
               .then(providers => setActiveImageProviders(providers || []))
               .catch(err => console.error("Error fetching AI image providers", err));
           } else {
             setActiveImageProviders([]); // Hide feature if inactive or not allowed by package limits
           }
         }
       }).catch(err => console.error(err));
    }

    // Load gallery
    loadGallery();
  }, [isOpen, isAiGeneratorEnabled, loadGallery, tenantId]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setUploadedUrl(null);
      setSelectedItem(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  function handleMetaChange(field: keyof MediaItem, value: string) {
    if (!selectedItem) return;
    const updated = { ...selectedItem, [field]: value };
    setSelectedItem(updated);
    
    // Update local list
    setGalleryItems(prev => prev.map(m => m.id === updated.id ? updated : m));

    // Debounce save
    setIsSavingMeta(true);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await updateMediaMetadata(updated.id, tenantId, {
        altText: updated.altText || "",
        caption: updated.caption || "",
        description: updated.description || ""
      });
      setIsSavingMeta(false);
    }, 800);
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

    if (result.success && result.url) {
      setUploadedUrl(result.url);
      // Pindah ke tab gallery agar user bisa lihat hasil upload
      setTimeout(() => {
        setActiveTab("gallery");
        loadGallery();
      }, 800);
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

  function handleChoose(url: string) {
    onSelect(url);
    onClose();
  }

  function formatBytes(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Media Library</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Nav */}
        <div className="flex px-6 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <button
            onClick={() => setActiveTab("upload")}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "upload"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => { setActiveTab("gallery"); loadGallery(); }}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "gallery"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Galeri Media
            {galleryItems.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                {galleryItems.length}
              </span>
            )}
          </button>
          
          {isAiGeneratorEnabled && activeImageProviders.length > 0 && (
            <button
              onClick={() => setActiveTab("generate")}
              className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === "generate"
                  ? "border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              Generate AI
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black/30">
          {/* === Tab: Upload === */}
          {activeTab === "upload" && (
            <div className="p-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center min-h-[280px] transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-100 dark:hover:bg-gray-900/50"
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-blue-600 font-medium">Mengunggah...</p>
                </div>
              ) : uploadedUrl ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden shadow border border-gray-200">
                    <img src={uploadedUrl} alt="Uploaded" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-green-600 font-semibold">✅ Upload berhasil!</p>
                  <p className="text-sm text-gray-500">Beralih ke tab Galeri Media...</p>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-3 py-8 px-16 text-center">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">Klik atau Seret Gambar ke Sini</p>
                    <p className="text-sm text-gray-500 mt-1">Mendukung JPG, PNG, WEBP • Maksimal 5MB</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </label>
              )}
              </div>
            </div>
          )}

          {/* === Tab: Gallery === */}
          {activeTab === "gallery" && (() => {
            const filteredGallery = galleryItems.filter(item => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return (
                item.filename.toLowerCase().includes(q) ||
                item.altText?.toLowerCase().includes(q) ||
                item.caption?.toLowerCase().includes(q) ||
                item.description?.toLowerCase().includes(q)
              );
            });

            return (
              <div className="flex flex-col h-full p-6">
                <div className="mb-4 text-sm font-semibold flex-shrink-0">
                  <input
                    type="text"
                    placeholder="🔍 Cari file, alt-text, atau caption..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                </div>
                
                {isLoadingGallery ? (
                  <div className="flex items-center justify-center min-h-[280px]">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : galleryItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[280px] text-gray-400 gap-3">
                    <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="font-medium">Belum ada media tersimpan.</p>
                    <button
                      onClick={() => setActiveTab("upload")}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Upload gambar pertama Anda →
                    </button>
                  </div>
                ) : (
                  <div className={`grid gap-5 ${selectedItem ? "grid-cols-1 lg:grid-cols-[1fr_300px]" : "grid-cols-1"}`}>
                    <div className="overflow-y-auto pr-2" style={{ maxHeight: "55vh" }}>
                      {filteredGallery.length === 0 ? (
                        <div className="py-8 text-center text-gray-500 text-sm">Tidak ada yang sesuai dengan "{searchQuery}"</div>
                      ) : (
                        <div className={`grid gap-3 ${selectedItem ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5"}`}>
                          {filteredGallery.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                              className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                                selectedItem?.id === item.id
                                  ? "border-blue-600 shadow-lg shadow-blue-200 dark:shadow-blue-900"
                                  : "border-transparent border-gray-200 dark:border-transparent hover:border-blue-400"
                              }`}
                              title={item.filename}
                            >
                              <img
                                src={item.url}
                                alt={item.filename}
                                className="w-full h-full object-cover bg-gray-100 dark:bg-gray-900"
                              />
                              {selectedItem?.id === item.id && (
                                <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                                  <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shadow">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                                {formatBytes(item.sizeBytes)}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedItem && (
                      <div className="flex flex-col gap-3 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-4 overflow-y-auto" style={{ maxHeight: "55vh" }}>
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2 flex-shrink-0">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase">Detail Gambar</h3>
                          {isSavingMeta && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold transition-opacity">Menyimpan...</span>}
                        </div>
                        <div className="flex-shrink-0">
                           <img src={selectedItem.url} alt="Preview" className="w-full aspect-video object-contain bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800" />
                        </div>
                        
                        <div className="text-xs space-y-3 pt-2">
                          <div>
                            <label className="block text-gray-500 font-medium mb-1">Alt Text</label>
                            <input value={selectedItem.altText || ""} onChange={(e) => handleMetaChange("altText", e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-gray-500 font-medium mb-1">Caption</label>
                            <input value={selectedItem.caption || ""} onChange={(e) => handleMetaChange("caption", e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-gray-500 font-medium mb-1">Description</label>
                            <textarea value={selectedItem.description || ""} onChange={(e) => handleMetaChange("description", e.target.value)} rows={3} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded px-2 py-1.5 resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"></textarea>
                          </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
                          <button
                            onClick={() => handleChoose(selectedItem.url)}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors text-sm"
                          >
                            Gunakan Gambar Ini
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* === Tab: Generate AI === */}
          {activeTab === "generate" && (
            <AiImageTab 
               articleContext={{ title: articleTitle || "", content: "" }}
               onSelect={handleChoose}
               availableProviders={activeImageProviders.map(p => p.id)}
            />
          )}

        </div>
      </div>
    </div>
  );
}
