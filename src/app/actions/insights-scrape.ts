"use server";

import { getSession } from "@/lib/session";
import { hasCapability } from "@/lib/auth/capabilities";
import { scrapeArticle, scrapeArticles, buildAIContext } from "@/lib/scraper/firecrawl";
import { generateArticle } from "@/app/actions/ai-generate";

export async function scrapeAndPrepareContext(urls: string[]) {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts"))
    throw new Error("Unauthorized");

  if (urls.length === 0) throw new Error("Tidak ada URL untuk di-scrape.");
  if (urls.length > 5) throw new Error("Maksimal 5 URL per request.");

  const scraped = await scrapeArticles(urls);
  if (scraped.length === 0) throw new Error("Semua URL gagal di-scrape.");

  return {
    success: true,
    context: buildAIContext(scraped),
    sources: scraped.map((s) => ({ title: s.title, url: s.sourceUrl })),
    count: scraped.length,
  };
}

export async function scrapeAndGenerateArticle(params: {
  url: string;
  title: string;
  tone?: string;
  length?: string;
  language?: string;
  pov?: string;
}) {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts"))
    throw new Error("Unauthorized");

  // Step 1: Scrape article content
  const scraped = await scrapeArticle(params.url);

  // Step 2: Build context from scraped content
  const context = buildAIContext([scraped]);

  // Step 3: Generate article with AI using scraped content as reference
  // Use scraped title as topic context, but instruct AI to create its own fresh title
  const result = await generateArticle({
    topic: scraped.title || params.title,
    referenceContent: context,
    tone: params.tone ?? "journalistic",
    length: params.length ?? "medium",
    language: params.language ?? "id",
    pov: params.pov ?? "neutral",
    customInstruction:
      "PENTING: Buat judul artikel yang BARU dan berbeda dari judul referensi asli. " +
      "Tulis ulang konten dengan sudut pandang dan angle yang segar. " +
      "Jangan salin judul asli secara kata per kata.",
  });

  if (!result.success) {
    throw new Error(result.error ?? "Gagal generate artikel.");
  }

  return {
    success: true as const,
    html: result.text as string,
    sourceTitle: scraped.title,
    sourceUrl: scraped.sourceUrl,
    tokensUsed: result.tokensUsed,
    creditCost: result.creditCost,
  };
}
