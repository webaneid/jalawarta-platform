import { getDecryptedCredential } from "@/app/actions/apikeys";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";

export const IMAGE_PROVIDERS_MODELS: Record<string, { label: string; models: { id: string; label: string }[] }> = {
  openai_dalle: {
    label: "OpenAI DALL·E",
    models: [
      { id: "dall-e-3", label: "DALL-E 3 (Ultra High Quality)" },
      { id: "dall-e-2", label: "DALL-E 2 (Fast & Classic)" }
    ],
  },
  gemini_imagen: {
    label: "Google Imagen (Gemini API)",
    models: [
      { id: "gemini-3.1-flash-image-preview", label: "Gemini 3.1 Flash Image" },
      { id: "gemini-3-pro-image-preview", label: "Gemini 3 Pro Image" },
      { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image" }
    ],
  },
  fal_flux: {
    label: "Fal.ai (Flux)",
    models: [
      { id: "fal-ai/flux/schnell", label: "Flux Schnell (Fast & Good)" },
      { id: "fal-ai/flux/dev", label: "Flux Dev (High Quality)" },
      { id: "fal-ai/flux-pro", label: "Flux Pro (Professional)" }
    ],
  },
  ideogram: {
    label: "Ideogram 2.0",
    models: [
      { id: "ideogram-2", label: "Ideogram 2.0 (Best for Typography)" }
    ],
  }
};

/**
 * Expand a simple short prompt into a high quality visual prompt.
 */
export async function expandImagePromptWithAI(shortPrompt: string, originalContent?: string): Promise<string> {
  try {
    // Try to get gemini key first as the default brain for prompt expansion
    let apiKey = await getDecryptedCredential("ai_text_generation", "gemini");
    let aiModel;

    if (apiKey) {
      const google = createGoogleGenerativeAI({ apiKey });
      aiModel = google("gemini-2.5-flash"); // Use flash for speed
    } else {
      apiKey = await getDecryptedCredential("ai_text_generation", "openai_chatgpt");
      if (apiKey) {
        const openai = createOpenAI({ apiKey });
        aiModel = openai("gpt-4o-mini");
      }
    }

    if (!aiModel || !apiKey) {
      // Falback if no text generator API is configured
      return `${shortPrompt}, high resolution, 8k, detailed, professional photography`;
    }

    const { text } = await generateText({
      model: aiModel,
      system: `You are an expert midjourney/dall-e prompt engineer. Your task is to expand the user's short idea into a rich, highly detailed image generation prompt in English. Focus on lighting, camera framing, texture, and atmosphere. Output ONLY the raw prompt without quotes, pleasantries, or explanations. Keep it under 500 characters.`,
      prompt: `Original Article Context (optional): ${originalContent ? originalContent.substring(0, 500) : 'none'}\n\nUser Idea: ${shortPrompt}`,
    });

    return text.trim();
  } catch (err: any) {
    console.error("[expandImagePromptWithAI] Failed:", err);
    return `${shortPrompt}, photorealistic, visually stunning`;
  }
}

/**
 * Call the remote image generation API.
 */
export async function callImageGenerationProvider(
  provider: string,
  modelId: string,
  prompt: string,
  size: string,
  style: string
): Promise<{ url: string; revisedPrompt?: string }> {
  
  const apiKey = await getDecryptedCredential("ai_image_generation", provider);
  if (!apiKey) throw new Error(`API Key untuk provider "${provider}" tidak ditemukan atau belum aktif di Platform Vault.`);

  // 1. OpenAI DALL-E Implementation
  if (provider === "openai_dalle") {
    let openaiSize = "1024x1024";
    if (size === "9:16") openaiSize = "1024x1792";
    if (size === "16:9") openaiSize = "1792x1024";
    if (modelId === "dall-e-2") openaiSize = "1024x1024";

    const isVivid = style === "Digital Art" || style === "Anime" ? "vivid" : "natural";
    const finalPrompt = `[Style: ${style}] - ${prompt}`;

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelId,
        prompt: finalPrompt,
        n: 1,
        size: openaiSize,
        response_format: "url",
        ...(modelId === "dall-e-3" && { style: isVivid }),
      })
    });

    if (!res.ok) {
      const errBody = await res.json();
      throw new Error(errBody.error?.message || `OpenAI Error ${res.status}`);
    }

    const data = await res.json();
    return { url: data.data[0].url, revisedPrompt: data.data[0].revised_prompt };
  }

  // 2. Fal.ai (Flux) Implementation
  if (provider === "fal_flux") {
    let falSize: any = "square_hd";
    if (size === "16:9") falSize = "landscape_4_3"; // Flux options: square_hd, square, portrait_4_3, landscape_4_3, portrait_16_9, landscape_16_9
    if (size === "9:16") falSize = "portrait_16_9";
    if (size === "4:3") falSize = "landscape_4_3";

    const res = await fetch(`https://fal.run/${modelId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${apiKey}`
      },
      body: JSON.stringify({
        prompt: `[Style: ${style}] ${prompt}`,
        image_size: falSize,
        num_inference_steps: 28,
        guidance_scale: 3.5,
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Fal.ai Error: ${errText}`);
    }

    const data = await res.json();
    return { url: data.images[0].url };
  }

  // 3. Gemini Image Generation API
  if (provider === "gemini_imagen") {
    // Determine lighting based on style
    const isVivid = style === "Digital Art" || style === "Anime";
    const enhancedPrompt = `${prompt}. Visual Style: ${style}. ${isVivid ? 'Vivid colors, high contrast' : 'Natural lighting'}.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: enhancedPrompt }
            ]
          }
        ],
        generationConfig: {
          imageConfig: {
            aspectRatio: size
          }
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = errText;
      try {
         const errJson = JSON.parse(errText);
         errMsg = errJson.error?.message || errText;
      } catch(e) {}
      throw new Error(`Google Gemini Error: ${errMsg}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const part = candidate?.content?.parts?.[0];
    
    if (part?.inlineData) {
      const base64Str = part.inlineData.data;
      const mime = part.inlineData.mimeType || "image/png";
      const dataUrl = `data:${mime};base64,${base64Str}`;
      return { url: dataUrl };
    } else {
      throw new Error("Gagal mengambil data gambar dari respons Gemini API. Mungkin diblokir oleh filter keamanan.");
    }
  }

  // Fallback / Placeholder for others
  throw new Error(`Provider "${provider}" terdaftar di Vault namun integrasi kodenya sedang dalam pengembangan. Silakan gunakan OpenAI, Fal.ai, atau Gemini API.`);
}

