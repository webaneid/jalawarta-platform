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

export async function fetchTwitterTrends(query: string = "") {
  // Simulasi / Placeholder untuk integrasi Twitter API via RapidAPI di masa depan
  // Mengembalikan fake data agar UI tidak error.
  return [
    {
      title: "Tren tagar #JalawartaViral",
      author: { uniqueId: "twitter_user" },
      share_url: "https://twitter.com/search?q=JalawartaViral",
      statistics: { digg_count: 15000, share_count: 3000 }
    },
    {
      title: "Diskusi tajam tentang regulasi Cyber",
      author: { uniqueId: "tech_guru" },
      share_url: "https://twitter.com/tech_guru/status/123",
      statistics: { digg_count: 5000, share_count: 1200 }
    }
  ];
}

export async function fetchGoogleTrends(query: string = "") {
  // Simulasi Google Trends via RapidAPI
  return [
    {
      title: `Pencarian memuncak untuk: ${query || "Pemilu"}`,
      author: { uniqueId: "google_trends" },
      share_url: `https://trends.google.com/trends/explore?q=${query}`,
      statistics: { digg_count: 50000, share_count: 0 }
    }
  ];
}
