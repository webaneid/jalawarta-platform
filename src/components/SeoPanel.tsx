"use client";

import { useState, useMemo } from "react";

type SeoConfig = {
  focusKeyword: string;
  seoTitle: string;
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
};

type SeoPanelProps = {
  config: SeoConfig;
  onChange: (config: SeoConfig) => void;
  title: string;
  slug: string;
  content: any; // ProseMirror/Tiptap JSON
  featuredImage?: string | null;
  onOpenMedia?: (field: "ogImage") => void;
  onAiSuggest?: () => void;
  isAiLoading?: boolean;
};

// Helper to get raw text from Tiptap JSON
const getRawText = (json: any): string => {
  if (!json) return "";
  let text = "";
  if (json.text) text += json.text;
  if (json.content) {
    json.content.forEach((child: any) => {
      text += getRawText(child) + " ";
    });
  }
  return text;
};

// Recursively scan Tiptap JSON for specific nodes/marks
const scanContent = (json: any, type: "image" | "link"): any[] => {
  if (!json) return [];
  let items: any[] = [];
  if (json.type === type) items.push(json);
  if (json.marks) {
    json.marks.forEach((mark: any) => {
      if (mark.type === type) items.push(mark);
    });
  }
  if (json.content) {
    json.content.forEach((child: any) => {
      items = [...items, ...scanContent(child, type)];
    });
  }
  return items;
};

export default function SeoPanel({
  config,
  onChange,
  title,
  slug,
  content,
  featuredImage,
  onOpenMedia,
  onAiSuggest,
  isAiLoading,
}: SeoPanelProps) {
  const [activeTab, setActiveTab] = useState<"seo" | "social">("seo");
  const [deviceMode, setDeviceMode] = useState<"mobile" | "desktop">("mobile");

  const defaultMetaDesc = useMemo(() => {
    const text = getRawText(content).trim();
    return text.slice(0, 145) + (text.length > 145 ? "..." : "");
  }, [content]);

  const rawText = useMemo(() => getRawText(content), [content]);

  // Basic SEO Audits (Phase 3 will expand this)
  const audits = useMemo(() => {
    const results = [];
    const kw = config.focusKeyword?.toLowerCase();

    // 1. Focus Keyword in Title
    if (!kw) {
      results.push({ label: "Focus Keyword belum ditentukan", status: "gray" });
    } else {
      const titleLower = title.toLowerCase();
      if (titleLower.includes(kw)) {
        results.push({ label: "Keyword ada di dalam Judul (Bagus!)", status: "green" });
      } else {
        results.push({ label: "Keyword tidak ditemukan di Judul", status: "red" });
      }

      // 2. Focus Keyword in Slug
      if (slug.toLowerCase().includes(kw.replace(/\s+/g, "-"))) {
        results.push({ label: "Keyword ada dalam Slug", status: "green" });
      } else {
        results.push({ label: "Keyword tidak ditemukan di Slug", status: "orange" });
      }

      // 3. Focus Keyword in First Paragraph (simple check)
      if (rawText.toLowerCase().slice(0, 500).includes(kw)) {
        results.push({ label: "Keyword ada di paragraf pembuka", status: "green" });
      } else {
        results.push({ label: "Keyword tidak ada di awal tulisan", status: "orange" });
      }
    }

    // 4. Meta Description length
    const descLen = config.seoDescription?.length || 0;
    if (descLen === 0) {
      if (rawText.length > 0) {
        results.push({ label: "Meta description menggunakan default (145 huruf pertama).", status: "orange" });
      } else {
        results.push({ label: "Meta description belum diisi & konten kosong.", status: "red" });
      }
    } else if (descLen < 120) {
      results.push({ label: "Meta description kustom terlalu pendek", status: "orange" });
    } else if (descLen > 160) {
      results.push({ label: "Meta description kustom terlalu panjang", status: "orange" });
    } else {
      results.push({ label: "Panjang Meta description kustom ideal", status: "green" });
    }

    // 5. Featured Image
    if (featuredImage) {
      results.push({ label: "Gambar unggulan tersedia", status: "green" });
    } else {
      results.push({ label: "Belum ada gambar unggulan", status: "orange" });
    }

    // --- NEW DEEP AUDITS ---

    // 6. Word Count
    const words = rawText.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length < 300) {
      results.push({ label: `Konten terlalu pendek (${words.length} kata). Target: >300 kata.`, status: "orange" });
    } else {
      results.push({ label: `Panjang konten Bagus (${words.length} kata).`, status: "green" });
    }

    // 7. Keyword Density
    if (kw && words.length > 0) {
      const matches = rawText.toLowerCase().match(new RegExp(kw, "g"));
      const count = matches ? matches.length : 0;
      const density = (count / words.length) * 100;
      if (density < 0.5) {
        results.push({ label: `Kepadatan Kata Kunci rendah (${density.toFixed(1)}%). Tambahkan beberapa lagi.`, status: "orange" });
      } else if (density > 3) {
        results.push({ label: `Kepadatan Kata Kunci terlalu tinggi (${density.toFixed(1)}%). Hati-hati terdeteksi spam.`, status: "orange" });
      } else {
        results.push({ label: `Kepadatan Kata Kunci Ideal (${density.toFixed(1)}%).`, status: "green" });
      }
    }

    // 8. Image Alt-Text Audit
    const allImages = scanContent(content, "image");
    if (allImages.length > 0) {
      const missingAlt = allImages.filter(img => !img.attrs?.alt || img.attrs?.alt.trim() === "");
      if (missingAlt.length > 0) {
        results.push({ label: `${missingAlt.length} gambar dalam konten belum punya alt-text.`, status: "red" });
      } else {
        results.push({ label: "Semua gambar dalam konten sudah punya alt-text.", status: "green" });
      }
    }

    // 9. Links Audit (Internal & External)
    const allLinks = scanContent(content, "link");
    if (allLinks.length === 0) {
      results.push({ label: "Belum ada link internal/eksternal dalam konten.", status: "orange" });
    } else {
      const internal = allLinks.filter(l => l.attrs?.href?.includes("jalawarta.com") || l.attrs?.href?.startsWith("/"));
      const external = allLinks.filter(l => l.attrs?.href && !l.attrs.href.includes("jalawarta.com") && !l.attrs.href.startsWith("/"));
      
      if (internal.length > 0) {
        results.push({ label: `${internal.length} link internal ditemukan (Bagus untuk navigasi).`, status: "green" });
      } else {
        results.push({ label: "Tambahkan setidaknya 1 link internal ke berita lain.", status: "orange" });
      }

      if (external.length > 0) {
        results.push({ label: `${external.length} link eksternal ditemukan.`, status: "green" });
      } else {
        results.push({ label: "Berikan minimal 1 link referensi luar sebagai otoritas.", status: "orange" });
      }
    }

    return results;
  }, [config, title, slug, rawText, featuredImage, content]);

  const previewTitle = config.seoTitle || title || "Judul Halaman";
  const previewDesc = config.seoDescription || defaultMetaDesc || "Berikan deskripsi meta yang menarik di sini untuk meningkatkan rasio klik-tayang (CTR) Anda di mesin pencari...";

  const socialPreviewTitle = config.ogTitle || previewTitle;
  const socialPreviewDesc = config.ogDescription || previewDesc;
  const socialPreviewImage = config.ogImage || featuredImage;

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <button
          onClick={() => setActiveTab("seo")}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === "seo" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          SEO
        </button>
        <button
          onClick={() => setActiveTab("social")}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            activeTab === "social" ? "text-purple-600 border-b-2 border-purple-600" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          Social
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* TAB SEO CONTENT */}
        {activeTab === "seo" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Focus Keyphrase */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Focus Keyphrase</label>
                <button
                  onClick={onAiSuggest}
                  disabled={isAiLoading}
                  className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-1 rounded font-bold hover:bg-purple-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {isAiLoading ? (
                    <span className="w-2 h-2 border border-purple-700 border-t-transparent rounded-full animate-spin" />
                  ) : "✨ Suggest by AI"}
                </button>
              </div>
              <input
                type="text"
                value={config.focusKeyword}
                onChange={(e) => onChange({ ...config, focusKeyword: e.target.value })}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Masukkan kata kunci utamamu..."
              />
            </div>

            {/* Google Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Google Preview</label>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
                  <button
                    onClick={() => setDeviceMode("mobile")}
                    className={`p-1 rounded-md transition-all ${deviceMode === "mobile" ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-400"}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </button>
                  <button
                    onClick={() => setDeviceMode("desktop")}
                    className={`p-1 rounded-md transition-all ${deviceMode === "desktop" ? "bg-white dark:bg-gray-700 shadow-sm text-blue-600" : "text-gray-400"}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 21h6l-.75-4M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </button>
                </div>
              </div>

              <div className={`border border-gray-100 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-gray-900/30 ${deviceMode === "mobile" ? "max-w-[320px] mx-auto shadow-sm" : "w-full"}`}>
                <div className="text-[12px] text-[#202124] dark:text-gray-400 mb-1 flex items-center gap-1.5 truncate">
                  <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                  </span>
                  <div className="min-w-0">
                      <p className="font-medium truncate">jalawarta.com</p>
                      <p className="text-[11px] opacity-70 truncate">post &gt; {slug || "permalink"}</p>
                  </div>
                </div>
                <h4 className="text-[18px] text-[#1a0dab] dark:text-blue-400 font-medium leading-tight hover:underline cursor-pointer mb-1 line-clamp-2">
                  {previewTitle}
                </h4>
                <p className="text-[13px] text-[#4d5156] dark:text-gray-400 leading-snug line-clamp-3">
                  {previewDesc}
                </p>
              </div>
            </div>

            {/* SEO Overrides */}
            <div className="pt-2 space-y-4">
              <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">SEO Title Override</label>
                  <input
                    type="text"
                    value={config.seoTitle}
                    onChange={(e) => onChange({ ...config, seoTitle: e.target.value })}
                    className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 py-1 text-sm focus:border-blue-500 outline-none"
                    placeholder={title || "Judul Berita"}
                  />
              </div>
              <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Meta Description</label>
                  <textarea
                    rows={3}
                    value={config.seoDescription}
                    onChange={(e) => onChange({ ...config, seoDescription: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    placeholder={defaultMetaDesc || "Deskripsi Meta (max 160 karakter)..."}
                  />
                  <div className="flex justify-end">
                    <span className={`text-[10px] font-bold ${config.seoDescription.length > 160 ? "text-red-500" : "text-gray-400"}`}>
                      {config.seoDescription.length}/160
                    </span>
                  </div>
              </div>
            </div>

            {/* Analysis Results */}
            <div className="space-y-3 pt-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">SEO Analysis</label>
              <div className="space-y-3">
                  {audits.map((audit, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                        audit.status === "green" ? "bg-green-500" :
                        audit.status === "orange" ? "bg-orange-500" :
                        audit.status === "red" ? "bg-red-500" : "bg-gray-300"
                      }`} />
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">{audit.label}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB SOCIAL CONTENT */}
        {activeTab === "social" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Social Preview Card */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Social Media Preview</label>
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-950 shadow-sm">
                <div className="aspect-[1.91/1] w-full bg-gray-100 dark:bg-gray-900 relative">
                   {socialPreviewImage ? (
                     <img src={socialPreviewImage} alt="Social Preview" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     </div>
                   )}
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
                   <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">JALAWARTA.COM</p>
                   <h4 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 line-clamp-1">{socialPreviewTitle}</h4>
                   <p className="text-[13px] text-gray-500 line-clamp-2 leading-snug">{socialPreviewDesc}</p>
                </div>
              </div>
            </div>

            {/* Social Settings */}
            <div className="space-y-5">
               {/* Facebook/OG Image */}
               <div className="space-y-2">
                 <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Facebook/X Image</label>
                 <div className="flex gap-4">
                    <div className="w-24 h-16 rounded-lg bg-gray-100 dark:bg-gray-900 overflow-hidden border border-gray-200 dark:border-gray-800 flex-shrink-0">
                       {config.ogImage || featuredImage ? (
                         <img src={config.ogImage || featuredImage || ""} alt="OG" className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                         </div>
                       )}
                    </div>
                    <div className="flex flex-col justify-center gap-2">
                       <button
                         onClick={() => onOpenMedia?.("ogImage")}
                         className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                       >
                         Pilih Gambar
                       </button>
                       {config.ogImage && (
                         <button
                           onClick={() => onChange({ ...config, ogImage: "" })}
                           className="text-[10px] text-red-500 font-bold hover:underline"
                         >
                           Gunakan Featured Image
                         </button>
                       )}
                    </div>
                 </div>
               </div>

               {/* Social Title */}
               <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Social Title</label>
                  <input
                    type="text"
                    value={config.ogTitle}
                    onChange={(e) => onChange({ ...config, ogTitle: e.target.value })}
                    className="w-full bg-transparent border-b border-gray-200 dark:border-gray-800 py-1 text-sm focus:border-purple-600 outline-none"
                    placeholder={previewTitle}
                  />
               </div>

               {/* Social Description */}
               <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">Social Description</label>
                  <textarea
                    rows={3}
                    value={config.ogDescription}
                    onChange={(e) => onChange({ ...config, ogDescription: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-600 outline-none resize-none"
                    placeholder={previewDesc}
                  />
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
