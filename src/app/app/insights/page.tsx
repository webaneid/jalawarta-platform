import { db } from "@/db";
import { insights } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { hasCapability } from "@/lib/auth/capabilities";
import { formatTenantDate } from "@/lib/dateFormatter";
import { getTenantSettings } from "@/app/actions/settings";
import InsightsListClient from "./client";

export default async function SavedInsightsPage() {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  const tenantId = session?.tenantId!;
  const tenantSettings = await getTenantSettings(tenantId);

  const allInsights = await db.query.insights.findMany({
    where: eq(insights.tenantId, tenantId),
    orderBy: [desc(insights.createdAt)],
  });

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Antrian Artikel AI</h2>
      <p className="text-sm text-gray-500 mb-6">Insight yang sudah disimpan atau sedang dalam antrian pemrosesan Content Strategy.</p>
      
      <InsightsListClient insights={allInsights} />
    </div>
  );
}
