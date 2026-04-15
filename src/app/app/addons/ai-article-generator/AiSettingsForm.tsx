"use client";

import { useState, useTransition } from "react";
import { updateAiGeneratorConfig } from "@/app/actions/ai-generate";
import { PROVIDERS_MODELS } from "@/lib/ai-generator/providers";
import { IconSparkles, IconCheck, IconAlertCircle } from "@tabler/icons-react";

export default function AiSettingsForm({
  tenantId,
  initialConfig,
  availableProviders,
}: {
  tenantId: string;
  initialConfig: any;
  availableProviders: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    preferredProvider: initialConfig.preferredProvider || "gemini",
    preferredModel: initialConfig.preferredModel || "gemini-2.5-pro",
    defaultLanguage: initialConfig.defaultLanguage || "id",
    defaultTone: initialConfig.defaultTone || "professional",
  });
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const safeProviders = availableProviders.length > 0 
    ? availableProviders 
    : [{ id: form.preferredProvider, name: PROVIDERS_MODELS[form.preferredProvider]?.label || form.preferredProvider }];

  const currentModels = PROVIDERS_MODELS[form.preferredProvider]?.models || [];

  const handleSave = () => {
    setStatusMsg(null);
    startTransition(async () => {
      const result = await updateAiGeneratorConfig(form);
      if (result.success) {
        setStatusMsg({ type: "success", text: "Konfigurasi AI berhasil disimpan!" });
      } else {
        setStatusMsg({ type: "error", text: result.error || "Gagal menyimpan konfigurasi." });
      }
    });
  };

  const creditsUsed = initialConfig.creditsUsed ?? 0;
  const creditsLimit = initialConfig.creditsLimit ?? 20;
  const creditsLeft = Math.max(0, creditsLimit - creditsUsed);
  const pctUsed = Math.min(100, Math.round((creditsUsed / creditsLimit) * 100));

  return (
    <div className="space-y-6">
      {/* Kartu Sisa Kredit */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-violet-900/20">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
              <IconSparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight leading-tight">AI Credits</h2>
              <p className="text-violet-200 font-medium text-sm">Pemakaian kuota AI Builder Anda</p>
            </div>
          </div>
          <div className="text-right">
            <span className="block text-3xl font-black">{creditsLeft}</span>
            <span className="text-xs uppercase tracking-widest text-violet-300 font-bold">Tersisa</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-bold text-violet-200 mb-2">
            <span>{creditsUsed} terpakai</span>
            <span>{creditsLimit} total batas</span>
          </div>
          <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ease-out ${pctUsed > 90 ? 'bg-rose-400' : pctUsed > 75 ? 'bg-amber-400' : 'bg-green-400'}`} 
              style={{ width: `${pctUsed}%` }}
            ></div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
            <p className="text-xs text-violet-200 font-medium tracking-wide">
              *1 Kredit = 1000 token API
            </p>
            {creditsLeft === 0 && (
                <span className="px-2 py-1 bg-rose-500 rounded text-[10px] font-bold uppercase tracking-wider text-white">
                    Habis
                </span>
            )}
        </div>
      </div>

      {/* Form Preferensi */}
      <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
        <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest mb-6">Preferensi Edit</h3>
        
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">AI Provider Default</label>
              <select
                value={form.preferredProvider}
                onChange={e => {
                  const newProv = e.target.value;
                  const newModels = PROVIDERS_MODELS[newProv]?.models || [];
                  setForm({ ...form, preferredProvider: newProv, preferredModel: newModels[0]?.id || "" });
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none transition-shadow"
              >
                {safeProviders.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">AI Model Default</label>
              <select
                value={form.preferredModel}
                onChange={e => setForm({ ...form, preferredModel: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none transition-shadow"
              >
                {currentModels.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Bahasa Artikel</label>
              <select
                value={form.defaultLanguage}
                onChange={e => setForm({ ...form, defaultLanguage: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none transition-shadow"
              >
                <option value="id">Bahasa Indonesia</option>
                <option value="en">English (US)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Gaya Penulisan (Tone)</label>
              <select
                value={form.defaultTone}
                onChange={e => setForm({ ...form, defaultTone: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl font-bold text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-violet-500 outline-none transition-shadow"
              >
                <option value="professional">Professional</option>
                <option value="casual">Santai</option>
                <option value="journalistic">Jurnalistik</option>
                <option value="academic">Akademis</option>
              </select>
            </div>
          </div>
        </div>

        {statusMsg && (
          <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${
            statusMsg.type === "success" 
              ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
              : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            {statusMsg.type === "success" ? <IconCheck className="w-5 h-5"/> : <IconAlertCircle className="w-5 h-5" />}
            <p>{statusMsg.text}</p>
          </div>
        )}

        <div className="mt-8">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="w-full py-3.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black rounded-xl font-black text-sm transition-all focus:ring-4 focus:ring-gray-200 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isPending ? (
              <span className="w-5 h-5 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin"></span>
            ) : "Simpan Pengaturan"}
          </button>
        </div>
      </div>
    </div>
  );
}
