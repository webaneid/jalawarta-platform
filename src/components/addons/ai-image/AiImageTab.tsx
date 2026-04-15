"use client";

import { useState, useTransition } from "react";
import { expandImagePrompt, generateAiImageAction, saveGeneratedImageAction } from "@/app/actions/ai-image";
import { IMAGE_PROVIDERS_MODELS } from "@/lib/ai-generator/image-providers";
import { IconWand, IconSparkles, IconPhoto, IconDownload, IconCheck } from "@tabler/icons-react";

type AiImageTabProps = {
  articleContext?: { title: string; content: string };
  onSelect: (url: string) => void;
  availableProviders?: string[];
};

export default function AiImageTab({ articleContext, onSelect, availableProviders = ["openai_dalle"] }: AiImageTabProps) {
  const [isPending, startTransition] = useTransition();
  const [isExpanding, setIsExpanding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    prompt: articleContext?.title ? `Ilustrasi untuk: ${articleContext.title}` : "",
    provider: availableProviders.length > 0 ? availableProviders[0] : "openai_dalle",
    modelId: (availableProviders.length > 0 && IMAGE_PROVIDERS_MODELS[availableProviders[0]]) 
      ? IMAGE_PROVIDERS_MODELS[availableProviders[0]].models[0].id 
      : "dall-e-3",
    style: "Photo",
    size: "16:9",
    language: "id",
  });

  const [generatedResult, setGeneratedResult] = useState<{ url: string; revisedPrompt?: string } | null>(null);
  const [savedLocalUrl, setSavedLocalUrl] = useState<string | null>(null);

  const currentModels = IMAGE_PROVIDERS_MODELS[form.provider]?.models || [];

  const handleExpandPrompt = async () => {
    if (!form.prompt.trim()) return;
    setIsExpanding(true);
    setErrorMsg(null);
    const contentContext = articleContext?.content ? articleContext.content.replace(/<[^>]*>?/gm, '') : undefined;
    
    try {
      const res = await expandImagePrompt({ shortPrompt: form.prompt, originalContent: contentContext });
      if (res.success && res.prompt) {
        setForm(prev => ({ ...prev, prompt: res.prompt }));
      } else {
        setErrorMsg(res.error || "Gagal memperkaya prompt.");
      }
    } finally {
      setIsExpanding(false);
    }
  };

  const handleGenerate = () => {
    if (!form.prompt.trim()) {
      setErrorMsg("Harap masukkan deskripsi gambar.");
      return;
    }
    setErrorMsg(null);
    setGeneratedResult(null);
    setSavedLocalUrl(null);

    startTransition(async () => {
      const res = await generateAiImageAction(form);
      if (res.success && res.url) {
        setGeneratedResult({ url: res.url, revisedPrompt: res.revisedPrompt });
      } else {
        setErrorMsg(res.error || "Gagal membuat gambar.");
      }
    });
  };

  const handleSaveAndUse = async () => {
    if (!generatedResult?.url) return;
    setIsSaving(true);
    setErrorMsg(null);
    
    try {
      const finalPrompt = generatedResult.revisedPrompt || form.prompt;
      
      const formData = new FormData();
      formData.append("remoteUrl", generatedResult.url);
      formData.append("promptUsed", finalPrompt);
      
      const res = await saveGeneratedImageAction(formData);
      if (res.success && res.url) {
        setSavedLocalUrl(res.url);
        onSelect(res.url); // Meneruskan gambar ke text editor
      } else {
        setErrorMsg(res.error || "Gagal menyimpan gambar secara permanen.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] h-full overflow-hidden">
      
      {/* Left Panel: Configuration Form */}
      <div className="overflow-y-auto p-6 pr-4 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Prompt Gambar *</label>
            <button 
              type="button"
              onClick={handleExpandPrompt}
              disabled={isExpanding || !form.prompt.trim()}
              className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-violet-100 transition-colors disabled:opacity-50"
            >
              {isExpanding ? <span className="w-3 h-3 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></span> : <IconSparkles className="w-3 h-3" />}
              Generate Prompt
            </button>
          </div>
          <textarea
            value={form.prompt}
            onChange={e => setForm({ ...form, prompt: e.target.value })}
            className="w-full h-32 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl font-medium text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none resize-none transition-shadow"
            placeholder="Deskripsikan gambar yang ingin dibuat... (contoh: Kucing memakai baju astronot di bulan yang terang)"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Bahasa Prompt</label>
            <select
              value={form.language}
              onChange={e => setForm({ ...form, language: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none transition-shadow"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English (US/UK)</option>
              <option value="ar">Arabic</option>
              <option value="jp">Japanese</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Penyedia AI (Aktif di Vault)</label>
            <select
              value={form.provider}
              onChange={e => {
                const newProv = e.target.value;
                const newModels = IMAGE_PROVIDERS_MODELS[newProv]?.models || [];
                setForm({ ...form, provider: newProv, modelId: newModels[0]?.id || "" });
              }}
              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none transition-shadow"
            >
              {availableProviders.length > 0 ? (
                availableProviders.map(p => (
                  <option key={p} value={p}>{IMAGE_PROVIDERS_MODELS[p]?.label || p}</option>
                ))
              ) : (
                <option value="none" disabled>Tidak ada provider aktif</option>
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Pilihan Model</label>
            <select
              value={form.modelId}
              onChange={e => setForm({ ...form, modelId: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none transition-shadow"
            >
              {currentModels.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Gaya Gambar</label>
            <select
              value={form.style}
              onChange={e => setForm({ ...form, style: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none transition-shadow"
            >
              <option value="Photo">Photorealistic</option>
              <option value="Digital Art">Digital Art</option>
              <option value="Painting">Painting</option>
              <option value="Anime">Anime Style</option>
              <option value="Sketch">Pencil Sketch</option>
              <option value="3D Model">3D Render</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Ukuran (Rasio)</label>
            <select
              value={form.size}
              onChange={e => setForm({ ...form, size: e.target.value })}
              className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none transition-shadow"
            >
              <option value="16:9">16:9 (Lanskap Jurnalistik)</option>
              <option value="4:3">4:3 (Lanskap Standar)</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="9:16">9:16 (Story/Potret)</option>
            </select>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm font-bold border border-red-100 dark:border-red-900/50">
            {errorMsg}
          </div>
        )}

        <div className="pt-4">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending || isSaving || !form.prompt.trim()}
            className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-black text-sm shadow-lg shadow-violet-600/20 transition-all focus:ring-4 focus:ring-violet-200 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isPending ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Generating Magic...
              </>
            ) : (
              <>
                <IconWand className="w-5 h-5" />
                Generate Gambar (1 Kredit)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel: Preview & Actions */}
      <div className="bg-gray-100/50 dark:bg-gray-950/50 border-l border-gray-200 dark:border-gray-800 p-6 flex flex-col justify-center relative">
        <div className="absolute top-4 right-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Preview</div>
        
        {isPending ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 animate-pulse">
            <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/20 rounded-2xl flex items-center justify-center text-violet-500">
              <IconSparkles className="w-8 h-8 animate-bounce" />
            </div>
            <p className="font-bold text-violet-600 dark:text-violet-400 text-sm">Menyusun Pixel...</p>
          </div>
        ) : generatedResult ? (
          <div className="flex flex-col items-center justify-center h-full h-max-[500px]">
            <div className="w-full relative group rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 bg-black/5">
              <img 
                src={generatedResult.url} 
                alt="AI Generated Preview" 
                className={`w-full object-contain ${form.size === '16:9' ? 'aspect-video' : form.size === '1:1' ? 'aspect-square' : 'aspect-auto'}`}
              />
            </div>
            {generatedResult.revisedPrompt && (
              <p className="mt-4 text-xs text-center text-gray-500 italic max-h-20 overflow-y-auto w-full px-2">
                "{generatedResult.revisedPrompt}"
              </p>
            )}
            <div className="w-full mt-6">
              <button
                type="button"
                onClick={handleSaveAndUse}
                disabled={isSaving || !!savedLocalUrl}
                className="w-full py-3 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white rounded-xl font-black text-sm transition-all focus:ring-4 focus:ring-gray-200 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                    Menyimpan ke Galeri...
                  </>
                ) : savedLocalUrl ? (
                  <>
                    <IconCheck className="w-5 h-5 text-green-500" />
                    Tersimpan & Digunakan
                  </>
                ) : (
                  <>
                    <IconDownload className="w-5 h-5" />
                    Simpan & Gunakan Gambar
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
            <IconPhoto className="w-16 h-16 opacity-30" />
            <p className="text-sm font-medium">Gambar yang di-generate akan tampil di sini.</p>
          </div>
        )}
      </div>

    </div>
  );
}
