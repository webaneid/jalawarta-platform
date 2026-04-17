import { getWatchlist } from "@/app/actions/insights-news";
import CompetitorClient from "./CompetitorClient";

export default async function CompetitorMonitorPage() {
  const watchlist = await getWatchlist();

  return <CompetitorClient initialWatchlist={watchlist} />;
}
