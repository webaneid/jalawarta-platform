import { getDecryptedCredential } from "@/app/actions/apikeys";

export async function searchNews(query: string, timeRange: string = "m") {
  const apiKey = await getDecryptedCredential("news_insight", "serper");
  if (!apiKey) {
    throw new Error("API Key Serper belum dikonfigurasi di Platform Vault.");
  }

  const payload = JSON.stringify({
    q: query,
    num: 20,
    tbs: timeRange === "all" ? undefined : `qdr:${timeRange}`,
  });

  const response = await fetch("https://google.serper.dev/news", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: payload,
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.news || [];
}
