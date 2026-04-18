import { getDecryptedCredential } from "@/app/actions/apikeys";

export type ScrapeResult = {
  sourceUrl: string;
  title: string;
  content: string; // Markdown
};

async function firecrawlFetch(url: string): Promise<{ markdown: string; metadata: any }> {
  const apiKey = await getDecryptedCredential("web_scraping", "firecrawl");
  if (!apiKey) throw new Error("API Key Firecrawl belum dikonfigurasi di Platform Vault.");

  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.error || "Scraping gagal.");

  return {
    markdown: data.data?.markdown ?? "",
    metadata: data.data?.metadata ?? {},
  };
}

export async function scrapeArticle(url: string): Promise<ScrapeResult> {
  const result = await firecrawlFetch(url);

  if (!result.markdown) throw new Error(`Gagal scrape konten dari: ${url}`);

  return {
    sourceUrl: result.metadata?.sourceURL ?? url,
    title: result.metadata?.title ?? "",
    content: result.markdown,
  };
}

export async function scrapeArticles(urls: string[]): Promise<ScrapeResult[]> {
  const settled = await Promise.allSettled(urls.map((url) => firecrawlFetch(url)));

  return settled
    .map((r, i) => ({ r, url: urls[i] }))
    .filter(({ r }) => r.status === "fulfilled")
    .map(({ r, url }) => {
      const val = (r as PromiseFulfilledResult<any>).value;
      return {
        sourceUrl: val.metadata?.sourceURL ?? url,
        title: val.metadata?.title ?? "",
        content: val.markdown ?? "",
      };
    })
    .filter((item) => item.content.length > 0);
}

export function buildAIContext(scraped: ScrapeResult[]): string {
  return scraped
    .map(
      (s, i) =>
        `## Referensi ${i + 1}: ${s.title}\nSumber: ${s.sourceUrl}\n\n${s.content}`
    )
    .join("\n\n---\n\n");
}
