import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { users, tenants, tenantPlugins } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";

const PLUGIN_ID = "ai-insights";

export default async function PlatformAiInsightsPage() {
  const session = await getSession();
  if (!session?.email) redirect("/login");

  const dbUser = await db.query.users.findFirst({ where: eq(users.email, session.email) });
  if (!dbUser || dbUser.role !== "PLATFORM_ADMIN") redirect("/");

  const rows = await db
    .select({
      tenantId: tenants.id,
      siteName: tenants.siteName,
      subdomain: tenants.subdomain,
      status: tenantPlugins.status,
      config: tenantPlugins.config,
    })
    .from(tenantPlugins)
    .innerJoin(tenants, eq(tenants.id, tenantPlugins.tenantId))
    .where(eq(tenantPlugins.pluginId, PLUGIN_ID));

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      <div className="mb-10 space-y-2">
        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-2">
          <Link href="/platform/addons" className="text-xs font-bold uppercase tracking-wider hover:underline">Platform Add-ons</Link>
          <span className="text-gray-400">/</span>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">AI Content Insights</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">AI Insights — Monitoring Global</h1>
        <p className="text-gray-500 dark:text-gray-400">Daftar tenant yang mengaktifkan add-on AI Content Insights beserta konfigurasi platform riset mereka.</p>
      </div>

      <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">Belum ada tenant yang mengaktifkan add-on ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase tracking-widest text-[10px] font-black">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Tenant</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Platform Riset</th>
                  <th className="px-4 py-3 rounded-r-xl">Fitur Aktif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                {rows.map((r) => {
                  const config = (r.config || {}) as { isEnabled?: boolean; preferredPlatforms?: string[] };
                  return (
                    <tr key={r.tenantId} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                      <td className="px-4 py-4">
                        <p className="font-bold text-gray-900 dark:text-white">{r.siteName || r.subdomain}</p>
                        <p className="text-xs text-gray-400">{r.subdomain}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.status === "ACTIVE" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-600 dark:text-gray-400">
                        {(config.preferredPlatforms ?? []).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs font-medium ${config.isEnabled !== false ? "text-blue-600" : "text-gray-400"}`}>
                          {config.isEnabled !== false ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
