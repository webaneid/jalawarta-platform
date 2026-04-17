import { getDecryptedCredential } from "@/app/actions/apikeys";

async function getSerperApiKey() {
  const apiKey = await getDecryptedCredential("news_insight", "serper");
  if (!apiKey) throw new Error("API Key Serper belum dikonfigurasi di Platform Vault.");
  return apiKey;
}

async function callSerperNews(payload: Record<string, unknown>) {
  const apiKey = await getSerperApiKey();
  const response = await fetch("https://google.serper.dev/news", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
  const data = await response.json();
  return data.news || [];
}

export async function searchNews(query: string, timeRange: string = "m") {
  return callSerperNews({
    q: query,
    num: 20,
    tbs: timeRange === "all" ? undefined : `qdr:${timeRange}`,
  });
}

export async function searchNewsBySite(domain: string, query: string = "", timeRange: string = "w") {
  const q = query ? `site:${domain} ${query}` : `site:${domain}`;
  return callSerperNews({
    q,
    num: 20,
    tbs: timeRange === "all" ? undefined : `qdr:${timeRange}`,
    gl: "id",
    hl: "id",
  });
}
