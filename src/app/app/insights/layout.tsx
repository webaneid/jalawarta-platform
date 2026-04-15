import Link from "next/link";

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      {/* Header and Nav */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Insights</h1>
          <p className="text-sm text-gray-500">Riset artikel trending dan scrape konten kompetitor otomatis.</p>
        </div>
        <div className="flex bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 p-1 rounded-lg">
          <Link 
            href="/insights" 
            className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            Saved Insights
          </Link>
          <Link 
            href="/insights/news" 
            className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            News Search
          </Link>
          <Link 
            href="/insights/social" 
            className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            Social Trends
          </Link>
        </div>
      </div>

      <div className="mt-4">
        {children}
      </div>
    </div>
  );
}
