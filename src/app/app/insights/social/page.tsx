import { getSession } from "@/lib/session";
import { hasCapability } from "@/lib/auth/capabilities";
import SocialSearchClient from "./client";
import { getSocialSearchHistory } from "@/app/actions/insights-social";

export default async function SocialInsightPage() {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  const history = await getSocialSearchHistory();

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Social Media Trends</h2>
      <p className="text-sm text-gray-500 mb-6">Mencari konten viral dan trending dari TikTok & Sosial Media lainnya via RapidAPI.</p>
      
      <SocialSearchClient history={history} />
    </div>
  );
}
