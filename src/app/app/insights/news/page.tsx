import { getSession } from "@/lib/session";
import { hasCapability } from "@/lib/auth/capabilities";
import NewsSearchClient from "./client";
import { getNewsSearchHistory } from "@/app/actions/insights-news";

export default async function NewsInsightPage() {
  const session = await getSession();
  if (!session?.tenantId || !hasCapability(session.role as any, "edit_posts")) throw new Error("Unauthorized");

  const history = await getNewsSearchHistory();

  return (
    <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">News Search Engine</h2>
      <p className="text-sm text-gray-500 mb-6">Mencari artikel berita relevan dari seluruh web via Google News API.</p>
      
      <NewsSearchClient history={history} />
    </div>
  );
}
