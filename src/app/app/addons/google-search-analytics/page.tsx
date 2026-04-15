import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tenantPlugins } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import GoogleSettingsForm from "./GoogleSettingsForm";
import Link from "next/link";

export default async function GoogleSearchAnalyticsPage() {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/login");

  // Get current config
  const [activePlugin] = await db
    .select()
    .from(tenantPlugins)
    .where(and(
        eq(tenantPlugins.tenantId, session.tenantId),
        eq(tenantPlugins.pluginId, "google-search-analytics")
    ))
    .limit(1);

  // Jika plugin tidak aktif atau tidak ditemukan, redirect balik ke katalog
  if (!activePlugin || activePlugin.status !== "ACTIVE") {
      redirect("/addons");
  }

  const config = (activePlugin.config as any) || {};

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="mb-10 space-y-2">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <Link href="/addons" className="text-xs font-bold uppercase tracking-wider hover:underline">Add-ons</Link>
            <span className="text-gray-400">/</span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Google Search & Analytics</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Konfigurasi Google</h1>
        <p className="text-gray-500 dark:text-gray-400">Hubungkan portal berita Anda dengan ekosistem Google untuk SEO dan monitoring trafik.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-6">
            <GoogleSettingsForm 
                tenantId={session.tenantId} 
                initialConfig={config} 
            />
        </div>

        <div className="space-y-6 text-sm">
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 p-6 rounded-3xl">
                <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-4 uppercase text-[10px] tracking-widest">Pusat Bantuan</h3>
                <ul className="space-y-4">
                    <li className="flex gap-2">
                        <span className="text-blue-500 font-bold">1.</span>
                        <p className="text-blue-800/80 dark:text-blue-400">Dapatkan **Measurement ID** di Admin {">"} Data Streams pada Google Analytics 4.</p>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-blue-500 font-bold">2.</span>
                        <p className="text-blue-800/80 dark:text-blue-400">Dapatkan **Verification ID** di Settings {">"} Ownership Verification pada Google Search Console.</p>
                    </li>
                </ul>
            </div>

            <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-sm">
                <p className="text-gray-500 leading-relaxed italic text-[11px]">
                    * Perubahan konfigurasi akan langsung diterapkan di seluruh halaman publik situs Anda setelah disimpan.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
