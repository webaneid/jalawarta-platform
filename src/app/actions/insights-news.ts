"use server";

import { db } from "@/db";
import { newsSearches, newsResults, insights } from "@/db/schema";
import { getSession } from "@/lib/session";
import { hasCapability } from "@/lib/auth/capabilities";
import { searchNews as fetchSerperNews } from "@/lib/insight-providers/serper";
import { desc, eq } from "drizzle-orm";

export async function runNewsInsightSearch(query: string, timeRange: string = "d") {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  // Call the external API Provider
  const rawResults = await fetchSerperNews(query, timeRange);

  // Save the Search History
  const [searchRecord] = await db.insert(newsSearches).values({
    tenantId: session.tenantId,
    theme: query,
    timeRange: timeRange,
    resultsCount: rawResults.length,
  }).returning();

  // Save the Results to DB
  const resultsToInsert = rawResults.map((item: any, idx: number) => ({
    searchId: searchRecord.id,
    title: item.title,
    url: item.link,
    snippet: item.snippet,
    publishDate: item.date,
    position: idx + 1,
  }));

  if (resultsToInsert.length > 0) {
    await db.insert(newsResults).values(resultsToInsert);
  }

  return { success: true, searchId: searchRecord.id, results: resultsToInsert };
}

export async function getNewsSearchHistory() {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  return db.query.newsSearches.findMany({
    where: eq(newsSearches.tenantId, session?.tenantId!),
    orderBy: [desc(newsSearches.createdAt)],
    limit: 20,
  });
}

export async function saveAsInsight(title: string, url: string) {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  const [savedInsight] = await db.insert(insights).values({
    tenantId: session?.tenantId!,
    topic: title,
    sourceUrl: url,
    sourceType: "news_insight",
    status: "PENDING",
  }).returning();

  return { success: true, insight: savedInsight };
}
