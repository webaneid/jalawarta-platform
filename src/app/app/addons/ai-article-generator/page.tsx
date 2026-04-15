import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { tenantPlugins } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import AiSettingsForm from "./AiSettingsForm";
import { getAiGeneratorConfig, getActivePlatformProviders } from "@/app/actions/ai-generate";

export default async function AiGeneratorSettingsPage() {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/login");

  // Get current plugin instance
  const [activePlugin] = await db
    .select()
    .from(tenantPlugins)
    .where(and(
        eq(tenantPlugins.tenantId, session.tenantId),
        eq(tenantPlugins.pluginId, "ai-article-generator")
    ))
    .limit(1);

  if (!activePlugin || activePlugin.status !== "ACTIVE") {
      redirect("/addons");
  }

  const aiConfig = await getAiGeneratorConfig();
  const availableProviders = await getActivePlatformProviders();

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="mb-10 space-y-2">
        <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-2">
            <Link href="/addons" className="text-xs font-bold uppercase tracking-wider hover:underline">Add-ons</Link>
            <span className="text-gray-400">/</span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">AI Article Generator</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">AI Content Generator</h1>
        <p className="text-gray-500 dark:text-gray-400">Pusat kendali kuota AI Anda dan pengaturan default model language yang Anda gunakan.</p>
      </div>

      <AiSettingsForm 
        tenantId={session.tenantId} 
        initialConfig={aiConfig} 
        availableProviders={availableProviders}
      />
    </div>
  );
}
