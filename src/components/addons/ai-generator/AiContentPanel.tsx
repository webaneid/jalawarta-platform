"use client";

import { useState, useTransition } from "react";
import { getAiGeneratorConfig, generateArticle } from "@/app/actions/ai-generate";
import { IconSparkles, IconWand, IconArrowsMaximize, IconTextSpellcheck } from "@tabler/icons-react";
import AiGenerateModal from "./AiGenerateModal";

interface AiContentPanelProps {
  onInsertToEditor: (markdownText: string) => void;
  onAiFix?: () => void;
  onAiExpand?: () => void;
  initialConfig?: {
    creditsLeft: number;
    creditsLimit: number;
    progressMessages: string[];
    templates: any[];
    availableProviders: string[];
    preferredProvider: string;
    preferredModel: string;
    defaultLanguage: string;
    defaultTone: string;
  };
}

/**
 * AiContentPanel — Komponen utama AI yang diinjeksikan ke sidebarPanels editor.
 * Satu komponen ini menjadi entry point semua fitur AI di editor.
 * Ubah komponen ini → semua laman editor (post & pages) berubah sekaligus.
 */
export default function AiContentPanel({
  onInsertToEditor, onAiFix, onAiExpand, initialConfig,
}: AiContentPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const [creditsLeft, setCreditsLeft] = useState(initialConfig?.creditsLeft ?? 0);

  return (
    <>
      <div className="bg-white dark:bg-gray-950 border border-violet-200 dark:border-violet-900/50 rounded-2xl shadow-sm overflow-hidden">
        {/* Header Panel */}
        <div className="px-5 py-4 border-b border-violet-100 dark:border-violet-900/50 bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconSparkles className="w-4 h-4 text-violet-600" />
              <h3 className="text-xs font-black uppercase tracking-widest text-violet-700 dark:text-violet-400">AI Generator</h3>
            </div>
            {initialConfig && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                creditsLeft > 5
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                  : creditsLeft > 0
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-red-100 text-red-600"
              }`}>
                {creditsLeft} / {initialConfig.creditsLimit} kredit
              </span>
            )}
          </div>
        </div>

        {/* Tombol Utama: Generate Artikel */}
        <div className="p-4 space-y-3">
          <button
            onClick={() => setShowModal(true)}
            disabled={creditsLeft <= 0}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-xl text-sm font-black shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <IconSparkles className="w-4 h-4" />
            Minta AI Bikin Artikel
          </button>
          {creditsLeft <= 0 && (
            <p className="text-[10px] text-red-500 text-center font-bold">Kredit habis. Hubungi admin.</p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-2 py-1">
            <div className="h-px bg-gray-100 dark:bg-gray-900 flex-1" />
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Toolbar AI</span>
            <div className="h-px bg-gray-100 dark:bg-gray-900 flex-1" />
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onAiFix}
              disabled={!onAiFix || creditsLeft <= 0}
              className="py-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-violet-50 dark:hover:bg-violet-950/50 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <IconTextSpellcheck className="w-3.5 h-3.5" />
              AI Fix
            </button>
            <button
              onClick={onAiExpand}
              disabled={!onAiExpand || creditsLeft <= 0}
              className="py-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-violet-50 dark:hover:bg-violet-950/50 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <IconArrowsMaximize className="w-3.5 h-3.5" />
              AI Expand
            </button>
          </div>

          {/* Hint text */}
          <p className="text-[10px] text-gray-400 text-center leading-relaxed">
            Pilih teks di editor lalu klik AI Fix atau AI Expand untuk mengolah teks yang dipilih.
          </p>
        </div>
      </div>

      {/* Modal Generator */}
      {showModal && initialConfig && (
        <AiGenerateModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onInsert={(text) => {
            onInsertToEditor(text);
            setCreditsLeft(prev => Math.max(0, prev - 1));
          }}
          progressMessages={initialConfig.progressMessages}
          templates={initialConfig.templates}
          availableProviders={initialConfig.availableProviders}
          preferredProvider={initialConfig.preferredProvider}
          preferredModel={initialConfig.preferredModel}
          defaultLanguage={initialConfig.defaultLanguage}
          defaultTone={initialConfig.defaultTone}
        />
      )}
    </>
  );
}
