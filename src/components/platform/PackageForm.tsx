"use client";

import { useState, useTransition } from "react";
import { savePackage } from "@/app/actions/platform";
import { useRouter } from "next/navigation";
import { IconPackage, IconArrowLeft, IconCheck, IconX, IconBox, IconPlugConnected } from "@tabler/icons-react";
import Link from "next/link";

interface PackageFormProps {
  initialData?: any;
  availableAddons: any[];
}

export default function PackageForm({ initialData, availableAddons }: PackageFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const coreModules = [
    { id: "core-news", name: "News Engine" },
    { id: "core-pages", name: "Static Pages" },
    { id: "core-media", name: "Central Media Library" }
  ];

  const [formData, setFormData] = useState({
    id: initialData?.id || "",
    name: initialData?.name || "",
    description: initialData?.description || "",
    price: initialData?.price || 0,
    maxUsers: initialData?.limits?.maxUsers || 1,
    maxPosts: initialData?.limits?.maxPosts || 10,
    maxStorageMB: Math.floor((initialData?.limits?.maxStorage || 52428800) / 1024 / 1024),
    aiCreditsLimit: initialData?.limits?.aiCreditsLimit || 20,
    aiImageCreditsLimit: initialData?.limits?.aiImageCreditsLimit || 10,
    allowedModules: initialData?.features?.allowedModules || ["core-news"], // default news aktif
    allowedAddons: initialData?.features?.allowedAddons || [],
    isActive: initialData?.isActive !== undefined ? initialData.isActive : true,
  });

  const toggleModule = (id: string) => {
    setFormData(prev => ({
      ...prev,
      allowedModules: prev.allowedModules.includes(id)
        ? prev.allowedModules.filter((m: string) => m !== id)
        : [...prev.allowedModules, id]
    }));
  };

  const toggleAddon = (id: string) => {
    setFormData(prev => ({
      ...prev,
      allowedAddons: prev.allowedAddons.includes(id)
        ? prev.allowedAddons.filter((a: string) => a !== id)
        : [...prev.allowedAddons, id]
    }));
  };

  const handleSave = () => {
    if (!formData.id || !formData.name) {
       setStatusMsg({ type: "error", text: "ID dan Nama Paket wajib diisi." });
       return;
    }

    setStatusMsg(null);
    startTransition(async () => {
      const res = await savePackage(formData);
      if (res.success) {
        setStatusMsg({ type: "success", text: "Paket berhasil disimpan!" });
        setTimeout(() => {
          router.push("/platform/packages");
          router.refresh();
        }, 1000);
      } else {
        setStatusMsg({ type: "error", text: "Gagal menyimpan: " + res.error });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <Link href="/platform/packages" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors">
              <IconArrowLeft className="w-6 h-6" />
           </Link>
           <div>
             <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
               {initialData ? "Edit Paket" : "Buat Paket Baru"}
             </h1>
             <p className="text-sm text-gray-500">Konfigurasi batasan sumber daya dan bundling fitur untuk tenant.</p>
           </div>
        </div>
        <button 
           onClick={handleSave} 
           disabled={isPending}
           className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {isPending ? "Menyimpan..." : (
            <>
              <IconCheck className="w-5 h-5" />
              Simpan Perubahan
            </>
          )}
        </button>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 ${statusMsg.type === "success" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
          {statusMsg.type === "success" ? <IconCheck /> : <IconX />}
          {statusMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Basic & Limits */}
        <div className="lg:col-span-2 space-y-8">
           {/* Section: Basic Info */}
           <div className="bg-white dark:bg-gray-950 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
              <div className="flex items-center gap-2 mb-2">
                 <IconPackage className="text-purple-600 w-5 h-5" />
                 <h2 className="text-lg font-bold">Informasi Dasar</h2>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div className="col-span-2 md:col-span-1">
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Internal ID (Slug)</label>
                   <input 
                      type="text" 
                      value={formData.id} 
                      disabled={!!initialData}
                      onChange={(e) => setFormData({...formData, id: e.target.value})} 
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-mono text-sm focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
                      placeholder="pro-plan"
                   />
                 </div>
                 <div className="col-span-2 md:col-span-1">
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Publik</label>
                   <input 
                      type="text" 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                      placeholder="Jala Warta Professional"
                   />
                 </div>
                 <div className="col-span-2">
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Deskripsi Singkat</label>
                   <textarea 
                      value={formData.description} 
                      onChange={(e) => setFormData({...formData, description: e.target.value})} 
                      className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                      rows={3}
                      placeholder="Berikan gambaran paket ini..."
                   />
                 </div>
                 <div className="col-span-2 md:col-span-1">
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Harga (IDR / Bulan)</label>
                   <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">Rp</span>
                      <input 
                        type="number" 
                        value={formData.price} 
                        onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} 
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-black text-purple-600 focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                   </div>
                 </div>
              </div>
           </div>

           {/* Section: Resource Limits */}
           <div className="bg-white dark:bg-gray-950 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
              <div className="flex items-center gap-2 mb-2">
                 <IconBox className="text-blue-600 w-5 h-5" />
                 <h2 className="text-lg font-bold">Batasan Sumber Daya (Limits)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Maks. Users</label>
                   <input 
                      type="number" 
                      value={formData.maxUsers} 
                      onChange={(e) => setFormData({...formData, maxUsers: Number(e.target.value)})} 
                      className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Maks. Posts</label>
                   <input 
                      type="number" 
                      value={formData.maxPosts} 
                      onChange={(e) => setFormData({...formData, maxPosts: Number(e.target.value)})} 
                      className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Storage (MB)</label>
                   <input 
                      type="number" 
                      value={formData.maxStorageMB} 
                      onChange={(e) => setFormData({...formData, maxStorageMB: Number(e.target.value)})} 
                      className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                   />
                 </div>
                 {formData.allowedAddons.includes('ai-article-generator') && (
                   <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Batas Kredit AI Teks</label>
                     <input 
                        type="number" 
                        value={formData.aiCreditsLimit} 
                        onChange={(e) => setFormData({...formData, aiCreditsLimit: Number(e.target.value)})} 
                        className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        placeholder="e.g. 20"
                     />
                   </div>
                 )}
                 {formData.allowedAddons.includes('ai-image-generator') && (
                   <div>
                     <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Batas Kredit AI Gambar</label>
                     <input 
                        type="number" 
                        value={formData.aiImageCreditsLimit} 
                        onChange={(e) => setFormData({...formData, aiImageCreditsLimit: Number(e.target.value)})} 
                        className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                        placeholder="e.g. 10"
                     />
                   </div>
                 )}
              </div>
           </div>
        </div>

        {/* Right Column: Features Selection */}
        <div className="space-y-8">
           <div className="bg-white dark:bg-gray-950 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm sticky top-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                   <IconPlugConnected className="text-orange-600 w-5 h-5" />
                   <h2 className="text-lg font-black tracking-tight">Feature Bundling</h2>
                </div>
              </div>

              {/* Core Modules List */}
              <div className="space-y-4 mb-8">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Core Modules</p>
                 <div className="space-y-2">
                    {coreModules.map(mod => (
                      <label key={mod.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group">
                         <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{mod.name}</span>
                         <input 
                            type="checkbox" 
                            checked={formData.allowedModules.includes(mod.id)} 
                            onChange={() => toggleModule(mod.id)}
                            className="w-5 h-5 rounded-md text-purple-600 focus:ring-purple-500 border-gray-300 dark:border-gray-700 bg-white dark:bg-black"
                         />
                      </label>
                    ))}
                 </div>
              </div>

              {/* Add-ons List */}
              <div className="space-y-4 mb-8">
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Marketplace Add-ons</p>
                 <div className="space-y-2">
                    {availableAddons.map(addon => (
                      <label key={addon.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors group">
                         <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{addon.name}</span>
                         <input 
                            type="checkbox" 
                            checked={formData.allowedAddons.includes(addon.id)} 
                            onChange={() => toggleAddon(addon.id)}
                            className="w-5 h-5 rounded-md text-orange-600 focus:ring-orange-500 border-gray-300 dark:border-gray-700 bg-white dark:bg-black"
                         />
                      </label>
                    ))}
                 </div>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-gray-900">
                 <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                       <input 
                          type="checkbox" 
                          checked={formData.isActive} 
                          onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                          className="sr-only peer"
                       />
                       <div className="w-11 h-6 bg-gray-200 dark:bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </div>
                    <div>
                       <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Aktif & Dijual</p>
                       <p className="text-[10px] text-gray-500">Paket dapat dipilih oleh tenant saat checkout.</p>
                    </div>
                 </label>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
