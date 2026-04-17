"use server";

import { db } from "@/db";
import { insights, posts, contentStrategies, socialResults } from "@/db/schema";
import { getSession } from "@/lib/session";
import { hasCapability } from "@/lib/auth/capabilities";
import { scrapeUrl } from "@/lib/insight-providers/firecrawl";
import { generateArticle } from "./ai-generate";
import { and, eq, inArray } from "drizzle-orm";
import { slugify } from "@/lib/slugify";

export async function dispatchInsightGeneration(insightId: string, customInstruction?: string) {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  const insightRecord = await db.query.insights.findFirst({
    where: and(eq(insights.id, insightId), eq(insights.tenantId, session.tenantId))
  });

  if (!insightRecord) throw new Error("Insight tidak ditemukan");
  
  // Ubah status ke processing
  await db.update(insights).set({ status: "PROCESSING" }).where(and(eq(insights.id, insightId), eq(insights.tenantId, session.tenantId)));

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
    const articleTitle = insightRecord.topic;
    const [newPost] = await db.insert(posts).values({
      tenantId: session!.tenantId!,
      authorId: session!.userId!,
      slug: `${slugify(articleTitle)}-${Date.now()}`,
      title: { id: articleTitle, en: "" },
      content: { html: result.text } as any,
      status: "DRAFT",
    }).returning();

    // Mark completed
    await db.update(insights).set({ 
      status: "COMPLETED", 
      articleCount: (insightRecord.articleCount || 0) + 1 
    }).where(and(eq(insights.id, insightId), eq(insights.tenantId, session.tenantId)));

    return { success: true, postId: newPost.id };

  } catch (error: any) {
    await db.update(insights).set({ status: "FAILED" }).where(and(eq(insights.id, insightId), eq(insights.tenantId, session.tenantId)));
    console.error("Generate Insight Error:", error);
    return { success: false, error: error.message };
  }
}

export async function dispatchStrategyGeneration(strategyId: string, customInstruction?: string) {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  const strategyRecord = await db.query.contentStrategies.findFirst({
    where: and(eq(contentStrategies.id, strategyId), eq(contentStrategies.tenantId, session.tenantId))
  });

  if (!strategyRecord) throw new Error("Strategy tidak ditemukan");

  await db.update(contentStrategies).set({ status: "GENERATING" }).where(and(eq(contentStrategies.id, strategyId), eq(contentStrategies.tenantId, session.tenantId)));

  try {
    const topics = strategyRecord.selectedTopics as string[];
    if (!topics || topics.length === 0) throw new Error("Tidak ada entitas data tren yang dipilih untuk di-generate.");

    const records = await db.select().from(socialResults).where(inArray(socialResults.id, topics));

    if (strategyRecord.strategyType === "roundup") {
      // Gabungkan referensi
      const combinedReference = records.map((r, i) => `Trend ${i+1} (${r.platform}):\nKonten/Deskripsi: ${r.content || 'Kosong'}\nPengunggah: ${r.author || 'Anonim'}\nTotal Interaksi: ${r.engagementTotal || 0}`).join("\n\n");

      const result = await generateArticle({
        topic: `Roundup Viral Trends (${records.length} topik sosial)`,
        referenceContent: combinedReference,
        tone: "casual",
        length: "long",
        language: "id",
        pov: "neutral",
        customInstruction: customInstruction || "Buatlah satu artikel rangkuman bergaya santai namun informatif yang menceritakan semua kejadian / trend viral ini dalam satu kesatuan artikel. Berikan opini benang merah di akhir paragraf."
      });

      if (!result.success) throw new Error(result.error);

      await db.insert(posts).values({
        tenantId: session.tenantId,
        authorId: session.userId!,
        slug: `${slugify(`roundup-tren-viral-${records[0]?.content?.substring(0, 30) || 'terbaru'}`)}-${Date.now()}`,
        title: { id: `Kumpulan Tren Viral: ${records[0]?.content?.substring(0, 30) || 'Terbaru'}...`, en: "" },
        content: { html: result.text } as any,
        status: "DRAFT",
      });
      
    } else if (strategyRecord.strategyType === "deep_dive_all") {
       for (const r of records) {
         const result = await generateArticle({
           topic: `Deep Dive: ${r.content?.substring(0, 50) || 'Viral Content'}`,
           referenceContent: `Satu tren spesifik:\nPlatform: ${r.platform}\nKonten: ${r.content}\nPengunggah: ${r.author}\nEngagement: ${r.engagementTotal}`,
           tone: "professional",
           length: "medium",
           language: "id",
           pov: "neutral",
           customInstruction: customInstruction || "Ciptakan sebuah bedah analitis (deep dive) untuk fenomena viral tunggal ini. Uraikan mengapa konten ini bisa populer dan apa maknanya secara umum."
         });

         if (result.success) {
           await db.insert(posts).values({
             tenantId: session.tenantId,
             authorId: session.userId!,
             slug: `${slugify(`bedah-tuntas-${r.content?.substring(0, 40) || 'tren-sosmed'}`)}-${r.id.substring(0, 6)}`,
             title: { id: `Bedah Tuntas: ${r.content?.substring(0, 40) || 'Tren Sosmed'}...`, en: "" },
             content: { html: result.text } as any,
             status: "DRAFT",
           });
         }
       }
    } else {
        throw new Error("Tipe strategi tidak dikenali: " + strategyRecord.strategyType);
    }

    await db.update(contentStrategies).set({ status: "COMPLETED" }).where(and(eq(contentStrategies.id, strategyId), eq(contentStrategies.tenantId, session.tenantId)));
    return { success: true };

  } catch (error: any) {
    await db.update(contentStrategies).set({ status: "FAILED" }).where(and(eq(contentStrategies.id, strategyId), eq(contentStrategies.tenantId, session.tenantId)));
    console.error("Strategy Generation Error:", error);
    return { success: false, error: error.message };
  }
}
