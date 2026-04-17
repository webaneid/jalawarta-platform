import { getWatchlist, getCompetitorSearchHistory } from "@/app/actions/insights-news";
import CompetitorClient from "./CompetitorClient";

export default async function CompetitorMonitorPage() {
  const [watchlist, history] = await Promise.all([
    getWatchlist().catch(() => []),
    getCompetitorSearchHistory().catch(() => []),
  ]);

  return <CompetitorClient initialWatchlist={watchlist} initialHistory={history} />;
}
