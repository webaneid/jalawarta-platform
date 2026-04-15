import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getTenantAddons } from "@/app/actions/addons";
import AddonStatusToggle from "./addon-status-toggle";

export default async function AddonsPage() {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/login");

  const { addons, error } = await getTenantAddons(session.tenantId);

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 transition-all duration-300">
      <div className="flex justify-between items-center mb-10">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Katalog Add-ons</h1>
          <p className="text-gray-500 dark:text-gray-400">Aktifkan fitur tambahan sesuai kebutuhan portal berita Anda.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-8 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          <span className="font-medium">Gagal memuat katalog: {error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {addons?.map((addon) => (
          <div 
            key={addon.id} 
            className={`group bg-white dark:bg-gray-950 border transition-all duration-500 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 relative overflow-hidden ${
              addon.status === "ACTIVE" 
                ? "border-blue-200 dark:border-blue-900 ring-1 ring-blue-50 dark:ring-blue-900/20" 
                : "border-gray-100 dark:border-gray-800"
            }`}
          >
            {/* Background Decoration */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full transition-all duration-700 blur-3xl opacity-10 ${
              addon.status === "ACTIVE" ? "bg-blue-500" : "bg-gray-400"
            }`} />

            <div className="flex items-start justify-between mb-6">
              <div className={`p-3 rounded-2xl transition-colors duration-500 ${
                addon.status === "ACTIVE" 
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              }`}>
                 {/* Icon per Add-on ID */}
                 {addon.id === 'advanced-contact-form' && (
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                 )}
                 {addon.id === 'ai-article-generator' && (
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                 )}
                 {addon.id === 'ai-image-generator' && (
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 )}
                 {!['advanced-contact-form', 'ai-article-generator', 'ai-image-generator'].includes(addon.id) && (
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                 )}
              </div>
              {addon.isAllowedByPackage ? (
                <AddonStatusToggle 
                  tenantId={session.tenantId!} 
                  pluginId={addon.id} 
                  initialStatus={addon.status} 
                />
              ) : (
                <div className="flex bg-gray-100 dark:bg-gray-800 text-gray-400 text-[10px] font-bold px-2 py-1 rounded-full items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  LOCKED
                </div>
              )}
            </div>

            <div className="space-y-3 relative z-10">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {addon.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                {addon.description}
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-900 flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-widest ${
                !addon.isAllowedByPackage ? "text-gray-400" :
                addon.status === "ACTIVE" ? "text-blue-600 dark:text-blue-400" : "text-gray-400"
              }`}>
                {!addon.isAllowedByPackage ? "Upgrade Required" : addon.status === "ACTIVE" ? "Running" : "Available"}
              </span>
              
              {addon.status === "ACTIVE" && addon.isAllowedByPackage && (
                <a 
                  href={`/addons/${
                    addon.id === 'advanced-contact-form' ? 'contact-form' : addon.id
                  }`} 
                  className="text-xs font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 group/btn"
                >
                  Manage Settings
                  <svg className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
