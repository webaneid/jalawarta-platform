"use server";

import { db } from "@/db";
import { socialSearches, socialResults, contentStrategies } from "@/db/schema";
import { getSession } from "@/lib/session";
import { hasCapability } from "@/lib/auth/capabilities";
import { fetchTikTokTrends } from "@/lib/insight-providers/rapidapi";
import { desc, eq } from "drizzle-orm";

export async function runSocialTrendSearch(keyword: string, platform: string = "tiktok") {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  // Panggil RapidAPI
  let rawResults: any[] = [];
  if (platform === "tiktok") {
    rawResults = await fetchTikTokTrends(keyword);
  } else {
    throw new Error(`Platform ${platform} not supported yet.`);
  }

  // Simpan record pencarian
  const [searchRecord] = await db.insert(socialSearches).values({
    tenantId: session.tenantId,
    keyword: keyword,
    platform: platform,
    totalResults: rawResults.length,
  }).returning();

  // Mapping hasil pencarian ke database
  const resultsToInsert = rawResults.map((item: any) => ({
    searchId: searchRecord.id,
    platform: platform,
    content: item.title || item.desc || "No Description",
    author: item.author?.uniqueId || item.author?.nickname || "unknown",
    link: item.play || item.share_url || `https://tiktok.com/@${item.author?.uniqueId}/video/${item.aweme_id}`,
    engagementTotal: (item.statistics?.digg_count || 0) + (item.statistics?.share_count || 0),
    isTrending: item.statistics?.digg_count > 10000,
  }));

  if (resultsToInsert.length > 0) {
    await db.insert(socialResults).values(resultsToInsert);
  }

  return { success: true, searchId: searchRecord.id, results: resultsToInsert };
}

export async function getSocialSearchHistory() {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  return db.query.socialSearches.findMany({
    where: eq(socialSearches.tenantId, session?.tenantId!),
    orderBy: [desc(socialSearches.createdAt)],
    limit: 20,
  });
}

// Logic mass-generation roadmap (Roundup)
export async function createContentStrategy(searchId: string, strategyType: string, selectedTopicsIds: string[]) {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  const expectedArticles = strategyType === "deep_dive_all" ? selectedTopicsIds.length : 1;

  const [strategy] = await db.insert(contentStrategies).values({
    tenantId: session?.tenantId!,
    searchId: searchId,
    strategyType: strategyType,
    selectedTopics: selectedTopicsIds,
    expectedArticles: expectedArticles,
    status: "PENDING",
  }).returning();

  return { success: true, strategyId: strategy.id };
}
