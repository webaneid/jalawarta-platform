"use server";

import { generateAiResponse, suggestSeoMetadata } from "@/lib/ai/gemini";
import { ensureCapability } from "@/lib/auth/guards";
import { getPluginConfig, updateCreditsUsed } from "@/app/actions/ai-generate";
import { tokensToCreditCost } from "@/lib/ai-generator/providers";

// Helper internal untuk memotong kredit
async function chargeAiCredits(tokensUsed: number) {
  const user = await ensureCapability("edit_posts");
  const tenantId = (user as any).tenantId;
  const role = (user as any).role;
  
  if (role === "SUPER_ADMIN") return; // Super admin bebas pulsa

  const config = await getPluginConfig(tenantId);
  const creditCost = tokensToCreditCost(tokensUsed);
  if (creditCost > 0) {
    await updateCreditsUsed(tenantId, config, creditCost);
  }
}

// Cek batas kredit sebelum melakukan aktivitas AI yang mahal
async function checkAiCreditsAvailable() {
  const user = await ensureCapability("edit_posts");
  const tenantId = (user as any).tenantId;
  const role = (user as any).role;

  if (role === "SUPER_ADMIN") return; // Super admin skip

  const config = await getPluginConfig(tenantId);
  const creditsLeft = config.aiCreditsLimit - config.aiCreditsUsed;
  if (creditsLeft <= 0) {
    throw new Error("Kredit AI Anda habis. Hubungi administrator untuk penambahan kuota.");
  }
}

export async function getWritingAssistant(content: string, instruction: string) {
  await checkAiCreditsAvailable();
  
  const prompt = `
    Anda adalah asisten penulis CMS profesional. 
    Ikuti instruksi tugas ini secara presisi: "${instruction}"
    
    Berikut adalah konten artikel saat ini (berformat HTML):
    <article_content>
    ${content}
    </article_content>
    
    ATURAN OUTPUT MUTLAK:
    1. Anda WAJIB mengembalikan output HANYA dalam format HTML (Semantic tag seperti <p>, <h2>, <strong>, <ul>).
    2. JANGAN BUNGKUS DENGAN MARKDOWN. Jangan gunakan markdown ticks seperti \`\`\`html atau \`\`\`. Output harus dimulai dan diakhiri dengan tag HTML.
    3. Teruskan dan perluas informasi dari body artikel yang tersedia tanpa membuang konteks aslinya (Jangan keluar dari konteks tulisan). 
    4. JANGAN menulis pendahuluan, penutup, atau kalimat pengantar di luar tag HTML hasil akhir.
    5. Batasi total output akhir MAKSIMAL 1000 KATA untuk menghindari penggunaan token komputasi yang berlebihan.
  `;

  const { text, tokensUsed } = await generateAiResponse(prompt);
  await chargeAiCredits(tokensUsed);

  return text;
}

export async function getSeoSuggestion(content: string) {
  await checkAiCreditsAvailable();
  
  const { data, tokensUsed } = await suggestSeoMetadata(content);
  await chargeAiCredits(tokensUsed);
  
  return data;
}
