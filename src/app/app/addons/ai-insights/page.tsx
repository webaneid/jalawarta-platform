import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getTenantAddons } from "@/app/actions/addons";
import { db } from "@/db";
import { tenantPlugins } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import AiInsightsSettingsForm from "./AiInsightsSettingsForm";

const PLUGIN_ID = "ai-insights";

export default async function AiInsightsSettingsPage() {
  const session = await getSession();
  if (!session?.tenantId) redirect("/login");

  const [activePlugin] = await db
    .select()
    .from(tenantPlugins)
    .where(and(eq(tenantPlugins.tenantId, session.tenantId), eq(tenantPlugins.pluginId, PLUGIN_ID)))
    .limit(1);

  if (!activePlugin || activePlugin.status !== "ACTIVE") redirect("/addons");

  const config = (activePlugin.config || {}) as {
    isEnabled?: boolean;
    preferredPlatforms?: string[];
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="mb-10 space-y-2">
        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-2">
          <Link href="/addons" className="text-xs font-bold uppercase tracking-wider hover:underline">Add-ons</Link>
          <span className="text-gray-400">/</span>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">AI Content Insights</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">AI Content Insights</h1>
        <p className="text-gray-500 dark:text-gray-400">Konfigurasi platform riset tren dan sumber berita yang digunakan untuk analisis konten otomatis.</p>
      </div>

      <AiInsightsSettingsForm
        tenantId={session.tenantId}
        initialConfig={{
          isEnabled: config.isEnabled ?? true,
          preferredPlatforms: config.preferredPlatforms ?? ["tiktok"],
        }}
      />
    </div>
  );
}
