import { db } from "@/db";
import { tenants, users, packages, plugins, tenantPlugins } from "@/db/schema";
import { count, eq, desc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  TRIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  EXPIRED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  SUSPENDED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default async function PlatformDashboardPage() {
  const [totalTenants] = await db.select({ value: count() }).from(tenants);
  const [totalUsers] = await db.select({ value: count() }).from(users);
  const [totalPackages] = await db.select({ value: count() }).from(packages);
  const [totalAddons] = await db.select({ value: count() }).from(plugins);

  // Breakdown status tenant
  const allTenants = await db
    .select({
      id: tenants.id,
      siteName: tenants.siteName,
      subdomain: tenants.subdomain,
      subscriptionStatus: tenants.subscriptionStatus,
      createdAt: tenants.createdAt,
      ownerName: users.name,
      packageName: packages.name,
    })
    .from(tenants)
    .leftJoin(users, eq(tenants.ownerId, users.id))
    .leftJoin(packages, eq(tenants.subscriptionId, packages.id))
    .orderBy(desc(tenants.createdAt));

  const statusBreakdown = allTenants.reduce<Record<string, number>>((acc, t) => {
    const s = t.subscriptionStatus ?? "TRIAL";
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  // Total AI credits used across all tenants
  const aiPluginConfigs = await db
    .select({ config: tenantPlugins.config })
    .from(tenantPlugins)
    .where(eq(tenantPlugins.pluginId, "ai-article-generator"));

  const totalAiCreditsUsed = aiPluginConfigs.reduce((sum, r) => {
    return sum + (((r.config as any)?.aiCreditsUsed as number) ?? 0);
  }, 0);
  const totalAiCreditsLimit = aiPluginConfigs.reduce((sum, r) => {
    return sum + (((r.config as any)?.aiCreditsLimit as number) ?? 0);
  }, 0);

  const recentTenants = allTenants.slice(0, 5);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Platform Overview</h1>
        <p className="text-gray-500 mt-2">Pusat Komando Jala Warta SaaS.</p>
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Tenants", val: totalTenants.value, color: "bg-blue-500", href: "/platform/tenants" },
          { label: "Total Users", val: totalUsers.value, color: "bg-purple-500", href: null },
          { label: "Packages", val: totalPackages.value, color: "bg-emerald-500", href: "/platform/packages" },
          { label: "Global Add-ons", val: totalAddons.value, color: "bg-orange-500", href: "/platform/addons" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white dark:bg-gray-950 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            {stat.href ? (
              <Link href={stat.href} className="flex items-center gap-4 group">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold ${stat.color} flex-shrink-0`}>
                  {stat.val}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">{stat.val}</h3>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold ${stat.color} flex-shrink-0`}>
                  {stat.val}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">{stat.val}</h3>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Tenant Status Breakdown */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status Tenant</h3>
          <div className="space-y-2.5">
            {["ACTIVE", "TRIAL", "EXPIRED", "SUSPENDED"].map((s) => (
              <div key={s} className="flex items-center justify-between">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[s]}`}>{s}</span>
                <span className="text-lg font-black text-gray-900 dark:text-white">{statusBreakdown[s] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Credits Usage */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Credits (All Tenants)</h3>
          {aiPluginConfigs.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada tenant menggunakan AI Generator.</p>
          ) : (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Terpakai</span>
                  <span className="font-bold text-gray-900 dark:text-white">{totalAiCreditsUsed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Limit</span>
                  <span className="font-bold text-gray-900 dark:text-white">{totalAiCreditsLimit}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mt-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${totalAiCreditsLimit > 0 ? Math.min(100, (totalAiCreditsUsed / totalAiCreditsLimit) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 text-right">
                  {totalAiCreditsLimit > 0 ? Math.round((totalAiCreditsUsed / totalAiCreditsLimit) * 100) : 0}% terpakai · {aiPluginConfigs.length} tenant aktif
                </p>
              </div>
              <Link
                href="/platform/addons/ai-article-generator"
                className="block text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors"
              >
                Kelola Kredit per Tenant →
              </Link>
            </>
          )}
        </div>

        {/* 5 Tenant Terbaru */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tenant Terbaru</h3>
            <Link href="/platform/tenants" className="text-xs font-semibold text-purple-600 hover:text-purple-700">
              Lihat semua →
            </Link>
          </div>
          {recentTenants.length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada tenant terdaftar.</p>
          ) : (
            <div className="space-y-2.5">
              {recentTenants.map((t) => (
                <Link
                  key={t.id}
                  href={`/platform/tenants/${t.id}`}
                  className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-900/50 rounded-xl px-2 py-1.5 -mx-2 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-purple-600 transition-colors">
                      {t.siteName || t.subdomain}
                    </p>
                    <p className="text-[10px] text-gray-400">{t.ownerName ?? "—"}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${STATUS_BADGE[t.subscriptionStatus ?? "TRIAL"]}`}>
                    {t.subscriptionStatus ?? "TRIAL"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
