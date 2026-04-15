import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDecryptedCredential } from "@/app/actions/apikeys";

/**
 * Mendapatkan saran dari Gemini berdasarkan prompt.
 */
export async function generateAiResponse(prompt: string) {
  try {
    const apiKey = await getDecryptedCredential("ai_text_generation", "gemini");
    if (!apiKey) {
      throw new Error("API Key Gemini belum dikonfigurasi di Platform Vault.");
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return {
      text: response.text(),
      tokensUsed: response.usageMetadata?.totalTokenCount || 0
    };
  } catch (err: any) {
    console.error("[Gemini] Error:", err);
    throw new Error(err.message || "Gagal mendapatkan respon dari AI.");
  }
}

/**
 * Utilitas untuk optimasi SEO.
 */
export async function suggestSeoMetadata(content: string) {
  const prompt = `
    Analisa konten berikut dan berikan saran SEO dalam format JSON:
    {
      "focusKeyword": "string",
      "seoTitle": "string",
      "seoDescription": "string"
    }
    
    Konten: ${content.substring(0, 2000)}
  `;
  
  const aiResult = await generateAiResponse(prompt);
  const responseText = aiResult.text;
  try {
    // Bersihkan markdown code blocks jika ada
    const jsonString = responseText.replace(/```json|```/g, "").trim();
    return { data: JSON.parse(jsonString), tokensUsed: aiResult.tokensUsed };
  } catch (err) {
    console.error("[Gemini] Gagal parsing JSON SEO:", responseText);
    return { data: null, tokensUsed: aiResult.tokensUsed };
  }
}
