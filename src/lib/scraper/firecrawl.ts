import { getDecryptedCredential } from "@/app/actions/apikeys";

export type ScrapeResult = {
  sourceUrl: string;
  title: string;
  content: string; // Markdown
};

async function getFirecrawlClient() {
  const apiKey = await getDecryptedCredential("web_scraping", "firecrawl");
  if (!apiKey) throw new Error("API Key Firecrawl belum dikonfigurasi di Platform Vault.");
  const { default: Firecrawl } = await import("@mendable/firecrawl-js");
  return new Firecrawl({ apiKey });
}

export async function scrapeArticle(url: string): Promise<ScrapeResult> {
  const client = await getFirecrawlClient();
  const result = await (client as any).scrapeUrl(url, { formats: ["markdown"] });

  if (!result?.markdown) throw new Error(`Gagal scrape konten dari: ${url}`);

  return {
    sourceUrl: result.metadata?.sourceURL ?? url,
    title: result.metadata?.title ?? "",
    content: result.markdown,
  };
}

export async function scrapeArticles(urls: string[]): Promise<ScrapeResult[]> {
  const client = await getFirecrawlClient();

  const settled = await Promise.allSettled(
    urls.map((url) => (client as any).scrapeUrl(url, { formats: ["markdown"] }))
  );

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
