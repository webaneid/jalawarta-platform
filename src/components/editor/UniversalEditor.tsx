"use client";

import { useState, useTransition, ReactNode, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { AddonBlockExtension } from "./extensions/AddonBlockExtension";
import MediaLibrary from "../MediaLibrary";
import SeoPanel from "../SeoPanel";
import { getWritingAssistant, getSeoSuggestion } from "@/app/actions/ai";
import EditorToolbar from "./EditorToolbar";

export type UniversalEditorProps = {
  tenantId: string;
  defaultTitle?: string;
  defaultSlug?: string;
  defaultFeaturedImage?: string;
  defaultContent?: object;
  defaultSeoConfig?: any;
  /**
   * Callback fired when "Publish" or "Save Draft" is clicked.
   * Returns an object indicating success or failure to display in the UI.
   */
  onSave: (
    data: {
      title: string;
      slug: string;
      content: any;
      featuredImage: string | null;
      seoConfig: any;
    },
    status: "DRAFT" | "PUBLISHED"
  ) => Promise<{ success: boolean; error?: string }>;
  /**
   * A slot to inject components like Post Categories and Tags into the sidebar
   */
  sidebarPanels?: ReactNode;
  /**
   * A slot to inject PresenceIndicator or other top-right controls
   */
  topRightControls?: ReactNode;
};

export default function UniversalEditor({
  tenantId,
  defaultTitle = "",
  defaultSlug = "",
  defaultFeaturedImage,
  defaultContent,
  defaultSeoConfig = { focusKeyword: "", seoTitle: "", seoDescription: "", ogTitle: "", ogDescription: "", ogImage: "" },
  onSave,
  sidebarPanels,
  topRightControls,
}: UniversalEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [isLibraryOpen, setLibraryOpen] = useState(false);
  const [libraryMode, setLibraryMode] = useState<"featured" | "inline" | "ogImage">("featured");
  const [title, setTitle] = useState(defaultTitle);
  const [slug, setSlug] = useState(defaultSlug);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!defaultSlug);
  const [featuredImage, setFeaturedImage] = useState<string | null>(defaultFeaturedImage || null);
  const [seoConfig, setSeoConfig] = useState(defaultSeoConfig);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension.configure({ inline: false, allowBase64: true }),
      AddonBlockExtension,
    ],
    immediatelyRender: false,
    content: defaultContent || `<h2>Mulai menulis...</h2><p>Gunakan toolbar di atas untuk memformat teks.</p>`,
    editorProps: {
      attributes: {
        class: "prose prose-blue dark:prose-invert prose-sm sm:prose-base focus:outline-none max-w-none min-h-[520px] p-4",
      },
    },
  });

  // Listener untuk menerima konten dari AI Generator Modal
  useEffect(() => {
    const handleAiInsert = (e: Event) => {
      const customEvent = e as CustomEvent;
      let htmlString = customEvent.detail?.markdown || "";
      
      // 1. Bersihkan sisa-sisa format markdown block jika AI membandel
      htmlString = htmlString.replace(/^```html\s*/i, "").replace(/```$/i, "");

      // 2. Ekstrak <h1> untuk Judul Artikel
      const h1Match = htmlString.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      
      if (h1Match) {
         // Ambil isi text di dalam tag h1 (buang tag HTML bersarang kalau ada)
         const extractedTitle = h1Match[1].replace(/<[^>]*>?/gm, '').trim();
         
         // Set Judul
         setTitle(extractedTitle);
         
         // Set Slug Otomatis jika user belum pernah mengedit slug secara manual
         if (!slugManuallyEdited) {
           setSlug(autoSlug(extractedTitle));
         }
         
         // Hapus <h1> dari body utama agar tidak tampil double di editor Tiptap
         htmlString = htmlString.replace(h1Match[0], "").trim();
      }

      // 3. Masukkan sisa HTML konten ke Tiptap
      if (editor && htmlString) {
        editor.chain().setContent(htmlString).run();
      }
    };

    window.addEventListener("ai:insert-content", handleAiInsert);
    return () => window.removeEventListener("ai:insert-content", handleAiInsert);
  }, [editor, slugManuallyEdited]);

  // Baca draft dari Insight News / Kompetitor Monitor (disimpan via sessionStorage)
  useEffect(() => {
    if (!editor) return;
    const draftHtml = sessionStorage.getItem("insight_ai_draft");
    if (!draftHtml) return;
    sessionStorage.removeItem("insight_ai_draft");
    // Dispatch lewat event yang sudah terbukti bekerja di AiGenerateModal
    // setTimeout memastikan listener ai:insert-content sudah terdaftar
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("ai:insert-content", { detail: { markdown: draftHtml } })
      );
    }, 0);
  }, [editor]);

  function autoSlug(val: string) {
    return val.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "").slice(0, 100);
  }

  function openLibrary(mode: "featured" | "inline" | "ogImage") {
    setLibraryMode(mode);
    setLibraryOpen(true);
  }

  function handleMediaSelect(url: string) {
    if (libraryMode === "inline" && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    } else if (libraryMode === "ogImage") {
      setSeoConfig((prev: any) => ({ ...prev, ogImage: url }));
    } else {
      setFeaturedImage(url);
    }
    setLibraryOpen(false);
  }

  async function handleSaveTrigger(status: "DRAFT" | "PUBLISHED") {
    if (!editor) return;
    startTransition(async () => {
      const finalSlug = slug || autoSlug(title);
      setStatusMsg("Menyimpan...");
      const result = await onSave(
        { title, slug: finalSlug, content: editor.getJSON(), featuredImage, seoConfig },
        status
      );

      if (result.success) {
        setStatusMsg(status === "PUBLISHED" ? "✅ Berhasil dipublikasikan!" : "✅ Draft tersimpan!");
      } else {
        setStatusMsg("❌ Error: " + result.error);
      }
    });
  }

  async function handleAiWriting(instruction: string) {
    if (!editor) return;
    setIsAiLoading(true);
    setStatusMsg("🤖 AI sedang berpikir...");
    try {
      const currentContent = editor.getHTML();
      let result = await getWritingAssistant(currentContent, instruction);
      if (result) {
        // Bersihkan markdown block yang kadang masih muncul dari AI
        result = result.replace(/^```html\s*/i, "").replace(/```$/i, "").trim();
        editor.chain().focus().setContent(result).run();
        setStatusMsg("✅ AI telah memperbarui konten!");
      }
    } catch (err: any) {
      setStatusMsg("❌ AI Error: " + err.message);
    } finally {
      setIsAiLoading(false);
    }
  }

  async function handleAiSeo() {
    if (!editor) return;
    setIsAiLoading(true);
    setStatusMsg("🤖 AI sedang menganalisa SEO...");
    try {
      const currentContent = editor.getText();
      const suggestion = await getSeoSuggestion(currentContent);
      if (suggestion) {
        setSeoConfig((prev: any) => ({
          ...prev,
          focusKeyword: suggestion.focusKeyword,
          seoTitle: suggestion.seoTitle,
          seoDescription: suggestion.seoDescription,
        }));
        setStatusMsg("✅ SEO disarankan oleh AI!");
      }
    } catch (err: any) {
      setStatusMsg("❌ AI SEO Error: " + err.message);
    } finally {
      setIsAiLoading(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

        {/* ===== KOLOM KIRI: Konten Utama ===== */}
        <div className="space-y-4">
          {topRightControls && (
            <div className="flex justify-end">
              {topRightControls}
            </div>
          )}

          {/* Judul + Slug */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Judul</label>
              <input
                type="text"
                placeholder="Masukkan judul yang menarik..."
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugManuallyEdited) setSlug(autoSlug(e.target.value));
                }}
                className="w-full text-xl font-bold px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-black text-gray-900 dark:text-gray-100 placeholder-gray-300 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Permalink</label>
              <div className="flex rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
                <span className="inline-flex items-center px-4 bg-gray-50 dark:bg-gray-900/50 text-gray-400 text-sm border-r border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  domain.com/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlugManuallyEdited(true); setSlug(autoSlug(e.target.value)); }}
                  onFocus={() => setSlugManuallyEdited(true)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-black text-sm text-gray-900 dark:text-gray-100 focus:ring-0 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tiptap Editor Node */}
          <div className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm relative overflow-visible">
            {editor && (
              <EditorToolbar 
                editor={editor}
                tenantId={tenantId}
                isAiLoading={isAiLoading}
                onAiFix={() => handleAiWriting("Perbaiki tata bahasa dan buat gaya bahasa naratif profesional.")}
                onAiExpand={() => handleAiWriting("Kembangkan konten ini menjadi artikel yang lebih lengkap dan mendalam (berita 5W+1H).")}
              />
            )}
            <div className="p-4 md:p-8 cursor-text max-w-4xl mx-auto" onClick={() => editor?.commands.focus()}>
              <EditorContent editor={editor} />
            </div>
          </div>

          {/* ===== Panel SEO ===== */}
          <SeoPanel
            config={seoConfig}
            onChange={setSeoConfig}
            title={title}
            slug={slug}
            content={editor?.getJSON()}
            featuredImage={featuredImage}
            onOpenMedia={(field) => openLibrary(field)}
            onAiSuggest={handleAiSeo}
            isAiLoading={isAiLoading}
          />
        </div>

        {/* ===== KOLOM KANAN: Sidebar ===== */}
        <div className="space-y-4">

          {/* Panel Publikasi */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Aksi</h3>
            <div className="space-y-2.5">
              <button 
                type="button" 
                onClick={() => handleSaveTrigger("PUBLISHED")} 
                disabled={isPending || !title.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menyimpan...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>Publikasikan</>
                )}
              </button>
              <button 
                type="button" 
                onClick={() => handleSaveTrigger("DRAFT")} 
                disabled={isPending || !title.trim()}
                className="w-full py-2.5 border border-gray-300 dark:border-gray-700 disabled:opacity-40 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                Simpan Draft
              </button>
            </div>
            {statusMsg && <p className="mt-3 text-xs text-center font-medium text-gray-600 dark:text-gray-400">{statusMsg}</p>}
          </div>

          {/* Panel Featured Image */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gambar Utama</h3>
            </div>
            {featuredImage ? (
              <div>
                <div className="relative group">
                  <img src={featuredImage} alt="Featured" className="w-full aspect-video object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button type="button" onClick={() => openLibrary("featured")} className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-semibold shadow mr-2">Ganti</button>
                    <button type="button" onClick={() => setFeaturedImage(null)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold shadow">Hapus</button>
                  </div>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => openLibrary("featured")}
                className="w-full aspect-video flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-xs font-medium uppercase tracking-wider">Pilih Gambar</span>
              </button>
            )}
          </div>

          {/* ===== Injected Sidebar Panels (Cat/Tags) ===== */}
          {sidebarPanels}

        </div>
      </div>

      <MediaLibrary
        isOpen={isLibraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={handleMediaSelect}
        tenantId={tenantId}
        articleTitle={title}
      />
    </>
  );
}
