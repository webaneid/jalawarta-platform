"use server";

import { db } from "@/db";
import { newsSearches, newsResults, newsSourceWatchlists, insights } from "@/db/schema";
import { getSession } from "@/lib/session";
import { hasCapability } from "@/lib/auth/capabilities";
import { searchNews as fetchSerperNews, searchNewsBySite } from "@/lib/insight-providers/serper";
import { desc, eq, and } from "drizzle-orm";

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

// ── Kompetitor Monitor ───────────────────────────────────────────────────────

export async function getWatchlist() {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  return db.select().from(newsSourceWatchlists)
    .where(eq(newsSourceWatchlists.tenantId, session.tenantId))
    .orderBy(desc(newsSourceWatchlists.createdAt));
}

export async function addSourceToWatchlist(name: string, domain: string) {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  // Normalize domain: strip protocol and trailing slashes
  const normalized = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();

  const [entry] = await db.insert(newsSourceWatchlists).values({
    tenantId: session.tenantId,
    name: name.trim(),
    domain: normalized,
  }).returning();

  return { success: true, entry };
}

export async function removeSourceFromWatchlist(id: string) {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  // SP-01: verify ownership before delete
  await db.delete(newsSourceWatchlists)
    .where(and(eq(newsSourceWatchlists.id, id), eq(newsSourceWatchlists.tenantId, session.tenantId)));

  return { success: true };
}

export async function searchNewsBySource(domain: string, query: string = "", timeRange: string = "w") {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  const rawResults = await searchNewsBySite(domain, query, timeRange);

  const [searchRecord] = await db.insert(newsSearches).values({
    tenantId: session.tenantId,
    searchType: "competitor",
    sourceDomain: domain,
    theme: query || null,
    timeRange,
    resultsCount: rawResults.length,
  }).returning();

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

  return { success: true, results: rawResults };
}
