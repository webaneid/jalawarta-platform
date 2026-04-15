"use server";

import { db } from "@/db";
import { insights, posts, contentStrategies } from "@/db/schema";
import { getSession } from "@/lib/session";
import { hasCapability } from "@/lib/auth/capabilities";
import { scrapeUrl } from "@/lib/insight-providers/firecrawl";
import { generateArticle } from "./ai-generate";
import { eq } from "drizzle-orm";

export async function dispatchInsightGeneration(insightId: string, customInstruction?: string) {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  const insightRecord = await db.query.insights.findFirst({
    where: eq(insights.id, insightId)
  });

  if (!insightRecord) throw new Error("Insight tidak ditemukan");
  
  // Ubah status ke processing
  await db.update(insights).set({ status: "PROCESSING" }).where(eq(insights.id, insightId));

  try {
    let referenceContent = "";

    // Jika ada sourceUrl, keruk kontennya.
    if (insightRecord.sourceUrl) {
      const scraped = await scrapeUrl(insightRecord.sourceUrl);
      referenceContent = scraped.markdown || "Gagal menarik teks referensi.";
    }

    // Panggil Engine AI Generator utama (menggunakan saldo Tenant)
    const result = await generateArticle({
      topic: insightRecord.topic,
      referenceContent: referenceContent,
      tone: "professional", // Atau default dari settings
      length: "medium",
      language: "id",
      pov: "neutral",
      customInstruction: customInstruction || "Ubah total struktur tulisan aslinya dan tambahkan opini jurnalistik. Jadikan unik dan SEO friendly."
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    // Auto-create DRAFT post
    const [newPost] = await db.insert(posts).values({
      tenantId: session!.tenantId!,
      authorId: session!.userId!,
      slug: `insight-${Date.now()}`,
      title: { id: insightRecord.topic, en: "" },
      content: { id: result.text, en: "" }, // Menyimpan HTML kembalian Gemini
      status: "DRAFT",
    }).returning();

    // Mark completed
    await db.update(insights).set({ 
      status: "COMPLETED", 
      articleCount: (insightRecord.articleCount || 0) + 1 
    }).where(eq(insights.id, insightId));

    return { success: true, postId: newPost.id };

  } catch (error: any) {
    await db.update(insights).set({ status: "FAILED" }).where(eq(insights.id, insightId));
    console.error("Generate Insight Error:", error);
    return { success: false, error: error.message };
  }
}
