// Konstanta kategori dan provider API Keys untuk Jalawarta Platform
// File ini dapat diimpor oleh komponen UI maupun Server Actions tanpa
// konflik dengan aturan "use server".

export const API_CATEGORIES: Record<string, { label: string; providers: string[] }> = {
  ai_text_generation: {
    label: "AI Text Generation",
    providers: ["gemini", "openai_chatgpt", "claude", "deepseek", "perplexity"],
  },
  ai_image_generation: {
    label: "AI Image Generation",
    providers: ["gemini_imagen", "openai_dalle", "fal_flux", "midjourney", "ideogram"],
  },
  payment_gateway: {
    label: "Payment Gateway",
    providers: ["midtrans", "xendit", "stripe"],
  },
  analytics: {
    label: "SEO & Analytics",
    providers: ["google_search_console", "google_analytics_4", "dataforseo"],
  },
  master_pixel: {
    label: "Marketing Pixel (Master)",
    providers: ["meta_facebook", "tiktok", "google_ads"],
  },
  news_insight: {
    label: "News API (Google Search)",
    providers: ["serper"],
  },
  web_scraping: {
    label: "Web Scraper Engine",
    providers: ["firecrawl"],
  },
  rapid_api: {
    label: "RapidAPI Hub",
    providers: ["rapidapi.com"],
  },
};
