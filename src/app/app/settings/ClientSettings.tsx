"use client";

import { useState, useTransition } from "react";
import { updateTenantSettings } from "@/app/actions/settings";
import MediaLibrary from "@/components/MediaLibrary";
import { useRouter } from "next/navigation";

export default function ClientSettings({ tenant }: { tenant: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Parse existing schemaConfig or supply defaults
  const currentConfig = tenant.schemaConfig || {};

  const [form, setForm] = useState({
    siteName: tenant.siteName || "",
    customDomain: tenant.customDomain || "",
    tagline: currentConfig.tagline || "",
    favicon: currentConfig.favicon || "",
    language: currentConfig.language || "id_ID",
    timezone: currentConfig.timezone || "Asia/Jakarta",
    maintenanceMode: currentConfig.maintenanceMode || false,
    searchVisible: currentConfig.searchVisible !== undefined ? currentConfig.searchVisible : true,
    footerText: currentConfig.footerText || `© ${new Date().getFullYear()} ${tenant.siteName || "Jalawarta"}. Hak cipta dilindungi.`,
  });

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // State for MediaLibrary Popup
  const [isLibraryOpen, setLibraryOpen] = useState(false);

  function handleSave() {
    startTransition(async () => {
      const mergedConfig = {
        ...currentConfig,
        tagline: form.tagline,
        favicon: form.favicon,
        language: form.language,
        timezone: form.timezone,
        maintenanceMode: form.maintenanceMode,
        searchVisible: form.searchVisible,
        footerText: form.footerText,
      };

      const result = await updateTenantSettings(tenant.id, {
        siteName: form.siteName,
        customDomain: form.customDomain,
        schemaConfig: mergedConfig,
      });

      if (result.success) {
        setStatusMsg("✅ Pengaturan berhasil disimpan.");
        router.refresh();
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        setStatusMsg("❌ Gagal menyimpan: " + result.error);
      }
    });
  }

  const generatedUrl = `${tenant.subdomain}.jalawarta.com`; // Assuming base SaaS domain

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        {/* Sidebar Nav Settings (opsional jika nanti ada tab lain seperti Appearance dll) */}
        <div className="space-y-1">
          <button className="w-full text-left px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium rounded-lg text-sm">
            General Options
          </button>
          <button className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900 font-medium rounded-lg text-sm transition-colors opacity-50 cursor-not-allowed">
            Appearance
          </button>
        </div>

        {/* Form List */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-lg font-bold">General Options</h2>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Nama & Slogan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Judul Situs</label>
                <input 
                  type="text" 
                  value={form.siteName} 
                  onChange={e => setForm({...form, siteName: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  placeholder="Misal: Beritaku Independen"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Slogan / Tagline</label>
                <input 
                  type="text" 
                  value={form.tagline} 
                  onChange={e => setForm({...form, tagline: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  placeholder="Deskripsi singkat web Anda..."
                />
              </div>
            </div>

            {/* URL Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Alamat Dasar (Sistem)</label>
                <input 
                  type="text" 
                  value={generatedUrl} 
                  readOnly
                  className="w-full bg-gray-100 dark:bg-gray-900/50 border border-transparent rounded-lg px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed font-mono"
                  title="Subdomain permanen bawaan platform"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex justify-between">
                  <span>Custom Domain</span>
                  <span className="text-xs text-gray-400 font-normal">Opsional</span>
                </label>
                <input 
                  type="text" 
                  value={form.customDomain} 
                  onChange={e => setForm({...form, customDomain: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  placeholder="misal: www.namaberitaku.com"
                />
              </div>
            </div>

            <hr className="border-gray-100 dark:border-gray-800" />

            {/* Icon / Image Settings */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ikon Situs (Favicon)</label>
              <div className="flex items-center gap-4">
                {form.favicon ? (
                  <div className="w-16 h-16 rounded-xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-50">
                    <img src={form.favicon} alt="Favicon" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  </div>
                )}
                <div>
                  <button onClick={() => setLibraryOpen(true)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                    Pilih Gambar...
                  </button>
                  {form.favicon && (
                    <button onClick={() => setForm({...form, favicon: ""})} className="ml-2 text-red-600 font-medium text-sm hover:underline">Hapus</button>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">Gambar proporsional 1:1, disarankan minimal 512x512 pixel.</p>
                </div>
              </div>
            </div>

            <hr className="border-gray-100 dark:border-gray-800" />

            {/* Language & Timezone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Bahasa Situs</label>
                <select 
                  value={form.language} 
                  onChange={e => setForm({...form, language: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 text-sm"
                >
                  <option value="id_ID">Bahasa Indonesia</option>
                  <option value="en_US">English (US)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Zona Waktu</label>
                <select 
                  value={form.timezone} 
                  onChange={e => setForm({...form, timezone: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 text-sm"
                >
                  <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                  <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                  <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
                </select>
              </div>
            </div>

            <hr className="border-gray-100 dark:border-gray-800" />

            {/* Extra Options (Switches) */}
            <div>
              <h3 className="text-sm font-bold mb-3 text-gray-900 dark:text-gray-100">Preferensi Situs</h3>
              
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="relative flex items-center pt-0.5">
                    <input 
                      type="checkbox" 
                      checked={form.searchVisible}
                      onChange={e => setForm({...form, searchVisible: e.target.checked})}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" 
                    />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Visibilitas Mesin Pencari</span>
                    <span className="block text-xs text-gray-500">Minta mesin pencari (seperti Google) untuk mengindeks situs ini agar muncul di pencarian.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <div className="relative flex items-center pt-0.5">
                    <input 
                      type="checkbox" 
                      checked={form.maintenanceMode}
                      onChange={e => setForm({...form, maintenanceMode: e.target.checked})}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" 
                    />
                  </div>
                  <div>
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Mode Pemeliharaan (Maintenance Mode)</span>
                    <span className="block text-xs text-gray-500">Sembunyikan akses situs dari publik karena sedang dalam tahap pembuatan atau perbaikan.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer Text */}
            <div className="pt-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Teks Footer Situs</label>
              <textarea 
                rows={2}
                value={form.footerText} 
                onChange={e => setForm({...form, footerText: e.target.value})}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              ></textarea>
            </div>

          </div>

          <div className="p-6 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
             {statusMsg ? (
                <span className={`text-sm font-semibold ${statusMsg.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {statusMsg}
                </span>
             ) : (
                <span className="text-sm text-gray-500">
                  Pastikan menyimpan perubahan Anda.
                </span>
             )}
             
             <button 
               onClick={handleSave} 
               disabled={isPending}
               className="px-6 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm disabled:opacity-50 flex flex-row items-center gap-2"
             >
               {isPending ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
               ) : (
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
               )}
               Simpan Pengaturan
             </button>
          </div>

        </div>
      </div>

      <MediaLibrary 
        isOpen={isLibraryOpen}
        onClose={() => setLibraryOpen(false)}
        tenantId={tenant.id}
        onSelect={(url) => setForm({ ...form, favicon: url })}
      />
    </>
  );
}
