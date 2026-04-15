"use client";

import { useState, useRef, useTransition } from "react";
import { generateArticle, saveAiTemplate } from "@/app/actions/ai-generate";
import { IconSparkles, IconX, IconCheck, IconBookmark, IconChevronDown } from "@tabler/icons-react";

interface AiGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (markdownText: string) => void;
  progressMessages: string[];
  templates: any[];
  availableProviders: string[];  // Hanya provider yang ada API Key-nya di Vault
  preferredProvider: string;
  preferredModel: string;
  defaultLanguage: string;
  defaultTone: string;
}

// Model terbaru per April 2026 — diperbarui dari hasil riset resmi
const PROVIDERS_MODELS: Record<string, { label: string; models: { id: string; label: string }[] }> = {
  gemini: {
    label: "Google Gemini",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Paling Canggih)" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Cepat & Cerdas)" },
      { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite (Paling Hemat)" },
      { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (Stabil)" },
    ],
  },
  openai_chatgpt: {
    label: "OpenAI ChatGPT",
    models: [
      { id: "gpt-4.1", label: "GPT-4.1 (Flagship, 1M Context)" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini (Cepat & Hemat)" },
      { id: "gpt-4.1-nano", label: "GPT-4.1 Nano (Paling Efisien)" },
      { id: "gpt-4o", label: "GPT-4o (Stabil)" },
    ],
  },
  claude: {
    label: "Anthropic Claude",
    models: [
      { id: "claude-opus-4-6", label: "Claude Opus 4.6 (Paling Canggih)" },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Recommended)" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (Cepat & Hemat)" },
    ],
  },
};

const FUNNY_STAGES = [
  { pct: 10, icon: "🧠" },
  { pct: 30, icon: "✍️" },
  { pct: 55, icon: "🔥" },
  { pct: 75, icon: "🎨" },
  { pct: 90, icon: "✨" },
  { pct: 100, icon: "🎉" },
];

export default function AiGenerateModal({
  isOpen, onClose, onInsert, progressMessages, templates,
  availableProviders = [], preferredProvider, preferredModel, defaultLanguage, defaultTone,
}: AiGenerateModalProps) {
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<"form" | "generating" | "done" | "error">("form");
  const [progressPct, setProgressPct] = useState(0);
  const [currentMsg, setCurrentMsg] = useState(progressMessages[0] || "Thinking...");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ text: string; creditsLeft: number; tokensUsed: number } | null>(null);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const msgIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    topic: "",
    referenceUrl: "",
    tone: defaultTone,
    length: "medium",
    language: defaultLanguage,
    pov: "third",
    provider: preferredProvider,
    model: preferredModel,
    customInstruction: "",
  });

  // Fallback untuk HMR: jika availableProviders kosong karena state lama, gunakan preferredProvider
  const safeAvailableProviders = availableProviders.length > 0 ? availableProviders : [preferredProvider];

  // Filter PROVIDERS_MODELS ke yang tersedia di Vault (atau fallback)
  const filteredProviders = Object.entries(PROVIDERS_MODELS).filter(
    ([key]) => safeAvailableProviders.includes(key)
  );

  const applyTemplate = (tmpl: any) => {
    setForm(prev => ({
      ...prev,
      tone: tmpl.tone || prev.tone,
      length: tmpl.length || prev.length,
      language: tmpl.language || prev.language,
      pov: tmpl.pov || prev.pov,
      provider: tmpl.provider || prev.provider,
      model: tmpl.model || prev.model,
      customInstruction: tmpl.customInstruction || "",
    }));
  };

  const startFunnyProgress = () => {
    let stage = 0;
    setProgressPct(5);
    setCurrentMsg(progressMessages[0] || "Thinking...");
    msgIntervalRef.current = setInterval(() => {
      stage++;
      if (stage < FUNNY_STAGES.length - 1) {
        setProgressPct(FUNNY_STAGES[stage].pct);
        setCurrentMsg(progressMessages[stage % progressMessages.length] || "Almost there...");
      }
    }, 2200);
  };

  const stopProgress = () => {
    if (msgIntervalRef.current) clearInterval(msgIntervalRef.current);
    setProgressPct(100);
  };

  const handleGenerate = () => {
    if (!form.topic.trim()) return;
    setPhase("generating");
    startFunnyProgress();

    startTransition(async () => {
      const res = await generateArticle({ ...form });
      stopProgress();
      if (res.success && res.text) {
        setResult({ text: res.text, creditsLeft: res.creditsLeft ?? 0, tokensUsed: res.tokensUsed ?? 0 });
        setPhase("done");
      } else {
        setErrorMsg(res.error || "Terjadi kesalahan saat generate.");
        setPhase("error");
      }
    });
  };

  const handleInsert = () => {
    if (result?.text) { onInsert(result.text); onClose(); }
  };

  const handleSaveTemplate = () => {
    if (!saveTemplateName.trim()) return;
    startTransition(async () => {
      await saveAiTemplate({ name: saveTemplateName, ...form });
      setShowSaveTemplate(false);
      setSaveTemplateName("");
    });
  };

  const handleClose = () => { setPhase("form"); setProgressPct(0); setResult(null); setErrorMsg(""); onClose(); };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-950 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 dark:border-gray-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
              <IconSparkles className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Minta AI Bikin Artikel</h2>
              <p className="text-xs text-gray-400">Powered by {PROVIDERS_MODELS[form.provider]?.label || form.provider}</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors"><IconX className="w-5 h-5" /></button>
        </div>

        {/* === PHASE: FORM === */}
        {phase === "form" && (
          <div className="p-7 space-y-6 flex-1">
            {/* Template Quick Apply */}
            {templates.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Template Tersimpan</p>
                <div className="flex gap-2 flex-wrap">
                  {templates.map((t: any) => (
                    <button key={t.id} onClick={() => applyTemplate(t)}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-xs font-bold rounded-lg transition-colors text-gray-700 dark:text-gray-300">
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Topik */}
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Judul / Topik Artikel *</label>
              <input type="text" value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                placeholder="cth: Dampak AI terhadap industri media di Indonesia" />
            </div>

            {/* URL Referensi */}
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">URL Referensi <span className="font-normal normal-case">(opsional)</span></label>
              <input type="url" value={form.referenceUrl} onChange={e => setForm({ ...form, referenceUrl: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-mono text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                placeholder="https://..." />
            </div>

            {/* Grid Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nada Penulisan</label>
                <select value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-sm focus:ring-2 focus:ring-violet-500 outline-none">
                  <option value="professional">Professional</option>
                  <option value="casual">Santai</option>
                  <option value="journalistic">Jurnalistik</option>
                  <option value="academic">Akademis</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Panjang Artikel</label>
                <select value={form.length} onChange={e => setForm({ ...form, length: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-sm focus:ring-2 focus:ring-violet-500 outline-none">
                  <option value="short">Pendek (~400 kata)</option>
                  <option value="medium">Sedang (~800 kata)</option>
                  <option value="long">Panjang (~1.500 kata)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Bahasa</label>
                <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-sm focus:ring-2 focus:ring-violet-500 outline-none">
                  <option value="id">Bahasa Indonesia</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Sudut Pandang</label>
                <select value={form.pov} onChange={e => setForm({ ...form, pov: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-sm focus:ring-2 focus:ring-violet-500 outline-none">
                  <option value="third">Orang ke-3 (Netral)</option>
                  <option value="first">Orang ke-1 (Saya/Kami)</option>
                  <option value="neutral">Tanpa Kata Ganti</option>
                </select>
              </div>
            </div>

            {/* ==== BOX AI MODEL SETTINGS ==== */}
            {filteredProviders.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                    <IconSparkles className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-gray-100 leading-tight">AI Engine Settings</h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pilihan Provider (hanya tampilkan opsi kalau lebih dari 1 provider diaktifkan platform) */}
                  {filteredProviders.length > 1 ? (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Provider Active</label>
                      <select
                        value={form.provider}
                        onChange={e => setForm({
                          ...form,
                          provider: e.target.value,
                          model: PROVIDERS_MODELS[e.target.value]?.models[0]?.id || ""
                        })}
                        className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                      >
                        {filteredProviders.map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Provider Active</label>
                      <div className="px-3 py-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-bold text-sm rounded-xl border border-violet-200 dark:border-violet-800">
                        {filteredProviders[0]?.[1]?.label || preferredProvider}
                      </div>
                    </div>
                  )}

                  {/* Pilihan Model */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">AI Model Selection</label>
                    <select
                      value={form.model}
                      onChange={e => setForm({ ...form, model: e.target.value })}
                      className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none shadow-sm"
                    >
                      {(PROVIDERS_MODELS[form.provider]?.models || []).map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}


            {/* Custom Instruction */}
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Instruksi Kustom <span className="font-normal normal-case">(opsional)</span></label>
              <textarea value={form.customInstruction} onChange={e => setForm({ ...form, customInstruction: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                rows={2} placeholder="cth: Mulai dengan pertanyaan retoris, sertakan 3 poin penting..." />
            </div>

            {/* Save Template */}
            <div className="pt-2">
              <button onClick={() => setShowSaveTemplate(s => !s)} className="text-xs text-gray-400 hover:text-violet-600 font-bold flex items-center gap-1 transition-colors">
                <IconBookmark className="w-3.5 h-3.5" /> Simpan sebagai Template
              </button>
              {showSaveTemplate && (
                <div className="mt-2 flex gap-2">
                  <input type="text" value={saveTemplateName} onChange={e => setSaveTemplateName(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-black focus:ring-2 focus:ring-violet-500 outline-none"
                    placeholder="Nama template..." />
                  <button onClick={handleSaveTemplate} disabled={isPending}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors">
                    Simpan
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === PHASE: GENERATING === */}
        {phase === "generating" && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 gap-8">
            <div className="text-6xl animate-bounce">{FUNNY_STAGES.find(s => s.pct >= progressPct)?.icon || "✨"}</div>
            <div className="text-center space-y-2">
              <p className="text-xl font-black text-gray-900 dark:text-white">{currentMsg}</p>
              <p className="text-xs text-gray-400">Mohon tunggu, AI sedang bekerja keras...</p>
            </div>
            <div className="w-full max-w-sm">
              <div className="flex justify-between text-xs font-bold text-gray-400 mb-2">
                <span>Progress</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* === PHASE: ERROR === */}
        {phase === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 gap-6 text-center">
            <div className="text-5xl">😵</div>
            <div>
              <p className="text-lg font-black text-red-600 mb-2">Oops, ada yang salah!</p>
              <p className="text-sm text-gray-500">{errorMsg}</p>
            </div>
            <button onClick={() => setPhase("form")} className="px-6 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">
              Coba Lagi
            </button>
          </div>
        )}

        {/* === PHASE: DONE === */}
        {phase === "done" && result && (
          <div className="flex-1 flex flex-col p-7 gap-6">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl">
              <IconCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-black text-emerald-700 dark:text-emerald-400">Artikel berhasil dibuat!</p>
                <p className="text-emerald-600/70 dark:text-emerald-500 text-xs">
                  Token digunakan: {result.tokensUsed.toLocaleString("id-ID")} · Kredit tersisa: <strong>{result.creditsLeft}</strong>
                </p>
              </div>
            </div>
            <div className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 overflow-y-auto max-h-60 font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
              {result.text}
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div className="px-7 py-5 border-t border-gray-100 dark:border-gray-900 flex justify-between items-center">
          <button onClick={handleClose} className="px-5 py-2.5 border border-gray-200 dark:border-gray-800 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">
            Batal
          </button>
          {phase === "form" && (
            <button onClick={handleGenerate} disabled={!form.topic.trim() || isPending}
              className="px-7 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-black shadow-lg shadow-violet-500/20 disabled:opacity-40 transition-all flex items-center gap-2">
              <IconSparkles className="w-4 h-4" /> Generate Sekarang
            </button>
          )}
          {phase === "done" && (
            <button onClick={handleInsert}
              className="px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
              <IconCheck className="w-4 h-4" /> Masukkan ke Editor
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
