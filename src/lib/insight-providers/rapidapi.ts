import { getDecryptedCredential } from "@/app/actions/apikeys";

export async function fetchTikTokTrends(query: string = "news") {
  const apiKey = await getDecryptedCredential("rapid_api", "rapidapi.com");
  if (!apiKey) {
    throw new Error("API Key RapidAPI belum dikonfigurasi.");
  }

  // Asumsi menggunakan endpoint tiktok-scraper7 dari RapidAPI
  const url = `https://tiktok-scraper7.p.rapidapi.com/feed/search?keywords=${encodeURIComponent(query)}&region=id&count=20`;
  const options = {
    method: 'GET',
    headers: {
      'x-rapidapi-key': apiKey,
      'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com'
    }
  };

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`RapidAPI error: ${response.status}`);
    }
    const result = await response.json();
    return result.data?.videos || [];
  } catch (error) {
    console.error("RapidAPI TikTok Error:", error);
    throw error;
  }
}
