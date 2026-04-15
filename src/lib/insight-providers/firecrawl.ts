import { getDecryptedCredential } from "@/app/actions/apikeys";

export async function scrapeUrl(url: string) {
  const apiKey = await getDecryptedCredential("web_scraping", "firecrawl");
  if (!apiKey) {
    throw new Error("API Key Firecrawl belum dikonfigurasi di Platform Vault.");
  }

  // Cek dokumentasi Firecrawl: v1/scrape
  const payload = JSON.stringify({
    url: url,
    formats: ["markdown", "html"],
    onlyMainContent: true
  });

  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: payload,
  });

  if (!response.ok) {
    throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.success) {
    return {
      markdown: data.data.markdown,
      html: data.data.html,
      metadata: data.data.metadata
    };
  } else {
    throw new Error(data.error || "Scraping failed");
  }
}
