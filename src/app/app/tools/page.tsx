"use client";

import Link from "next/link";

export default function ToolsDashboard() {
  const tools = [
    {
      title: "Import",
      description: "Impor konten dari platform lain seperti WordPress, Blogger, atau file RSS.",
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
      ),
      link: "/tools/import",
      status: "Tersedia",
    },
    {
      title: "Export",
      description: "Ekspor konten Jala Warta ke dalam format XML yang kompatibel dengan WordPress.",
      icon: (
        <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
      ),
      link: "/tools/export",
      status: "Tersedia",
    },
    {
      title: "Site Health",
      description: "Cek kesehatan situs dan optimasi database secara berkala.",
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04a11.352 11.352 0 00-1.1 9.491 11.352 11.352 0 001.072 2.916 11.974 11.974 0 006.012 5.618 11.954 11.954 0 006.012-5.618 11.352 11.352 0 001.072-2.916 11.352 11.352 0 00-1.1-9.491z" /></svg>
      ),
      link: "#",
      status: "Segera Hadir",
      disabled: true,
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Tools</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl">
          Kelola interoperabilitas data portal berita Anda. Impor konten dari situs lama atau ekspor untuk cadangan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool, i) => (
          <div 
            key={i} 
            className={`group bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 ${tool.disabled ? "opacity-60 cursor-not-allowed" : "hover:-translate-y-1"}`}
          >
            <div className="w-14 h-14 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              {tool.icon}
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{tool.title}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
              {tool.description}
            </p>
            
            <div className="flex items-center justify-between mt-auto">
              {tool.disabled ? (
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-full">
                  {tool.status}
                </span>
              ) : (
                <>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                    {tool.status}
                  </span>
                  <Link 
                    href={tool.link}
                    className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Buka Tool
                    <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </Link>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-600 rounded-2xl p-8 text-white relative overflow-hidden shadow-2xl">
         <div className="relative z-10 space-y-4 max-w-xl">
            <h2 className="text-2xl font-bold">Butuh Importer Khusus?</h2>
            <p className="opacity-90 text-sm leading-relaxed">
              Tim Jala Warta terus mengembangkan importer untuk berbagai platform. Jika Anda memiliki ribuan data dari CMS kustom, silakan hubungi tim dukungan kami.
            </p>
            <button className="px-6 py-2 bg-white text-blue-600 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-50 transition-colors">
              Hubungi Support
            </button>
         </div>
         <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
            <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
         </div>
      </div>
    </div>
  );
}
