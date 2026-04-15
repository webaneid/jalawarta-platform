"use client";

import { IconPlug, IconCheck, IconSearch, IconAdjustmentsHorizontal, IconDeviceLaptop, IconNews, IconFiles, IconPlugConnected } from "@tabler/icons-react";
import { useState } from "react";

export default function AddonsClient({ addons }: { addons: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAddons = addons.filter(addon => 
    addon.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    addon.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
          <IconPlugConnected className="text-orange-500 w-8 h-8" /> Add-on Marketplace
        </h1>
        <p className="text-gray-500 mt-2">Katalog ekstensi eksternal untuk memperkaya fitur pada setiap portal Tenant.</p>
      </header>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Cari add-on di marketplace..." 
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 transition-colors">
              <IconAdjustmentsHorizontal className="w-4 h-4" /> Filter
           </button>
           <button className="px-5 py-2.5 bg-orange-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-orange-700 transition-colors">
              + Daftarkan Plugin Baru
           </button>
        </div>
      </div>

      {/* Pluggable Add-ons Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAddons.map((addon) => (
            <div key={addon.id} className="group p-6 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:border-orange-500/50 transition-all relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                 <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    External
                 </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950 border border-orange-100 dark:border-orange-900 flex items-center justify-center mb-4 group-hover:bg-orange-100/50 dark:group-hover:bg-orange-900/20 transition-colors">
                 <IconPlug className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{addon.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-4">{addon.description}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-900">
                 <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <IconCheck className="w-3 h-3" /> SIAP DIGUNAKAN
                 </div>
                 <button className="text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-purple-600 transition-colors">
                    Detail & Config
                 </button>
              </div>
            </div>
          ))}
          {filteredAddons.length === 0 && (
            <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
               <IconPlug className="w-12 h-12 text-gray-300 mx-auto mb-2" />
               <p className="text-gray-500">Tidak ada add-on yang cocok dengan pencarian Anda.</p>
            </div>
          )}
        </div>
    </div>
  );
}
