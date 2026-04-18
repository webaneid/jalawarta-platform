"use client";

import { IconNews, IconFiles, IconDeviceLaptop, IconBrain, IconChartBar } from "@tabler/icons-react";

// Core modules are built-in features — NOT stored in DB, defined as constants here.
// "allowedModules" in packages.features is a gate for optional/premium modules.
// All modules below are ALWAYS active but some may require specific package tiers.
export const CORE_MODULES = [
  {
    id: "core-news",
    name: "News Engine",
    description: "Manajemen postingan berita berbasis kategori dan tag dengan Tiptap rich-text editor dan optimasi SEO terintegrasi.",
    icon: IconNews,
    version: "v1.0",
    tier: "all",        // tersedia di semua paket
    status: "STABLE",
  },
  {
    id: "core-pages",
    name: "Static Pages",
    description: "Pembuatan halaman statis (Tentang Kami, Kontak, Syarat & Ketentuan) untuk identitas situs tenant.",
    icon: IconFiles,
    version: "v1.0",
    tier: "all",
    status: "STABLE",
  },
  {
    id: "core-media",
    name: "Central Media Library",
    description: "Manajemen aset visual dengan drag & drop upload, auto-UUID sanitasi, metadata auto-save, dan pencarian instan.",
    icon: IconDeviceLaptop,
    version: "v0.9",
    tier: "all",
    status: "BETA",
  },
  {
    id: "core-ai-generator",
    name: "AI Article Generator",
    description: "Engine generate artikel dari topik/URL menggunakan AI (Gemini, OpenAI). Kredit berbasis kuota paket.",
    icon: IconBrain,
    version: "v1.0",
    tier: "addon",      // dikontrol via add-on 'ai-article-generator'
    status: "STABLE",
  },
  {
    id: "core-insights",
    name: "AI Insights & Research",
    description: "Riset konten via News Search, Social Trends, dan Competitor Monitor. Generate artikel langsung dari hasil riset.",
    icon: IconChartBar,
    version: "v1.0",
    tier: "addon",      // dikontrol via add-on 'ai-insights'
    status: "STABLE",
  },
] as const;

const STATUS_COLOR: Record<string, string> = {
  STABLE: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  BETA: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  WIP: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

type PackageModuleEntry = {
  id: string;
  name: string;
  allowedModules: string[];
};

export default function ModulesClient({
  packageModuleMap = [],
}: {
  packageModuleMap?: PackageModuleEntry[];
}) {
  function getPackagesForModule(moduleId: string): string[] {
    return packageModuleMap
      .filter((p) => p.allowedModules.includes(moduleId))
      .map((p) => p.name);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {CORE_MODULES.map((mod) => {
        const enabledIn = getPackagesForModule(mod.id);
        return (
          <div
            key={mod.id}
            className="group p-6 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:border-purple-400/60 transition-all relative overflow-hidden"
          >
            {/* Status badge */}
            <div className="absolute top-4 right-4">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${STATUS_COLOR[mod.status] ?? STATUS_COLOR.WIP}`}>
                {mod.status} {mod.version}
              </span>
            </div>

            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center mb-5 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/10 transition-colors">
              <mod.icon className="w-6 h-6 text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition-colors" />
            </div>

            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">{mod.name}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{mod.description}</p>

            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
              {mod.tier === "all" ? (
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  ✓ Tersedia di semua paket
                </p>
              ) : (
                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">
                  ⚡ Dikontrol via Add-on
                </p>
              )}

              {enabledIn.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {enabledIn.map((pkgName) => (
                    <span
                      key={pkgName}
                      className="text-[10px] px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-full font-medium"
                    >
                      {pkgName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
