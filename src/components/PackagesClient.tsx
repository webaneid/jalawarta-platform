import Link from "next/link";
import { IconPackage, IconEdit, IconPlus } from "@tabler/icons-react";

export default function PackagesClient({ existingPackages }: { existingPackages: any[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                <IconPackage className="w-6 h-6" />
             </div>
             <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Manajemen Paket SaaS</h2>
          </div>
          <p className="text-sm text-gray-500">Tentukan skema harga, batasan kuota, dan bundling modul untuk ekosistem Jala Warta.</p>
        </div>
        <Link 
          href="/platform/packages/create" 
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
        >
          <IconPlus className="w-5 h-5" />
          Buat Paket Baru
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {existingPackages.map((pkg) => (
          <div key={pkg.id} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm flex flex-col relative overflow-hidden group hover:border-purple-500/50 transition-all">
            <div className="absolute top-0 right-0 p-6">
               <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${pkg.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                 {pkg.isActive ? "Active" : "Disabled"}
               </span>
            </div>
            
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{pkg.name}</h3>
            <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 text-purple-600 dark:text-purple-400">
              Rp {pkg.price.toLocaleString("id-ID")} <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">/ bln</span>
            </p>
            <p className="text-sm text-gray-500 mb-8 flex-1 leading-relaxed">{pkg.description}</p>
            
            <div className="space-y-3 mb-8 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-900">
               <div className="flex items-center justify-between text-xs font-bold">
                 <span className="text-gray-400 uppercase tracking-widest">Maks. Users</span>
                 <span className="text-gray-900 dark:text-white">{pkg.limits?.maxUsers || "∞"}</span>
               </div>
               <div className="flex items-center justify-between text-xs font-bold">
                 <span className="text-gray-400 uppercase tracking-widest">Postingan</span>
                 <span className="text-gray-900 dark:text-white">{pkg.limits?.maxPosts || "∞"}</span>
               </div>
               <div className="flex items-center justify-between text-xs font-bold">
                 <span className="text-gray-400 uppercase tracking-widest">Storage</span>
                 <span className="text-gray-900 dark:text-white">{(pkg.limits?.maxStorage || 0) / 1024 / 1024} MB</span>
               </div>
               <div className="flex items-center justify-between text-xs font-bold">
                 <span className="text-gray-400 uppercase tracking-widest">Kredit AI Teks</span>
                 <span className="text-gray-900 dark:text-white">{pkg.limits?.aiCreditsLimit || 20}</span>
               </div>
               <div className="flex items-center justify-between text-xs font-bold">
                 <span className="text-gray-400 uppercase tracking-widest">Kredit AI Gambar</span>
                 <span className="text-gray-900 dark:text-white">{pkg.limits?.aiImageCreditsLimit || 10}</span>
               </div>
            </div>

            <Link 
              href={`/platform/packages/${pkg.id}/edit`} 
              className="w-full py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-xl text-sm font-black group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <IconEdit className="w-4 h-4" /> Kelola Paket
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
