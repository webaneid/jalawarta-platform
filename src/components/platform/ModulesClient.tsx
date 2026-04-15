"use client";

import { IconNews, IconFiles, IconDeviceLaptop, IconBox } from "@tabler/icons-react";

export default function ModulesClient() {
  const coreModules = [
    {
      id: "core-news",
      name: "News Engine",
      description: "Manajemen postingan berita berbasis kategori dan tag dengan optimasi SEO.",
      icon: IconNews,
      status: "STABLE v1.0"
    },
    {
      id: "core-pages",
      name: "Static Pages",
      description: "Pembuatan halaman statis (Tentang Kami, Kontak, dsb) untuk identitas tenant.",
      icon: IconFiles,
      status: "STABLE v1.0"
    },
    {
      id: "core-media",
      name: "Central Media Library",
      description: "Manajemen aset visual (gambar, video) yang dioptimasi untuk penyajian web.",
      icon: IconDeviceLaptop,
      status: "BETA v0.9"
    }
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
          <IconBox className="text-purple-600 w-8 h-8" /> Core Modules
        </h1>
        <p className="text-gray-500 mt-2">Daftar fitur bawaan (built-in) yang menjadi fondasi sistem Jala Warta.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coreModules.map((mod) => (
          <div key={mod.id} className="group p-8 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:border-purple-500/50 transition-all relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4">
               <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {mod.status}
               </span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center mb-6 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/10 transition-colors">
               <mod.icon className="w-8 h-8 text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{mod.name}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{mod.description}</p>
            
            <div className="mt-8 pt-6 border-t border-gray-50 dark:border-gray-900 flex items-center justify-between">
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tersedia di semua paket</span>
               <button className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors">Setup Config</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
