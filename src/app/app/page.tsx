import { auth } from "@/auth";
import { getTenantStats, getRecentActivity } from "@/app/actions/analytics";
import ActivityLog from "@/components/ActivityLog";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenantId = (session.user as any).tenantId;
  const stats = await getTenantStats(tenantId);
  const activities = await getRecentActivity(tenantId);

  return (
    <div className="flex flex-col font-sans">
      <header className="flex h-16 items-center border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-6">
        <div className="text-xl font-bold text-blue-600">Dashboard Utama</div>
        <div className="flex-1" />
        <div className="text-sm text-gray-500">
          Selamat datang, <span className="font-semibold text-gray-900 dark:text-gray-100">{session.user.name}</span>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-8">
        {/* Card Statistik Utama */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Artikel Berita", value: stats.posts, icon: "📰", color: "blue", href: "/posts" },
            { title: "Halaman Statis", value: stats.pages, icon: "📄", color: "emerald", href: "/pages" },
            { title: "Komentar Baru", value: stats.comments, icon: "💬", color: "purple", href: "/comments" },
            { title: "File Media", value: stats.media, icon: "🖼️", color: "orange", href: "/media" },
          ].map((stat, i) => (
            <Link
              key={i}
              href={stat.href}
              className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-blue-200 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-900"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{stat.icon}</span>
                <span className={`text-xs font-bold uppercase tracking-widest text-${stat.color}-600 dark:text-${stat.color}-400 opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Lihat Semua →
                </span>
              </div>
              <h3 className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                {stat.title}
              </h3>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                {stat.value}
              </p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          {/* Kolom Kiri: Quick Actions & Overview */}
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-blue-500">⚡</span> Quick Actions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Link href="/posts/editor" className="flex flex-col items-center justify-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 hover:bg-blue-100 transition-colors">
                  <span className="text-xl mb-1">✍️</span>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400">Tulis Berita</span>
                </Link>
                <Link href="/media" className="flex flex-col items-center justify-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-900 hover:bg-purple-100 transition-colors">
                  <span className="text-xl mb-1">📸</span>
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400">Upload Media</span>
                </Link>
                <Link href="/pages/editor" className="flex flex-col items-center justify-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900 hover:bg-emerald-100 transition-colors">
                  <span className="text-xl mb-1">📄</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Buat Halaman</span>
                </Link>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-950 text-center">
              <div className="max-w-md mx-auto space-y-3">
                 <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🚀</span>
                 </div>
                 <h2 className="text-xl font-bold text-gray-900 dark:text-white">Jalawarta Pro v1.2</h2>
                 <p className="text-sm text-gray-500">
                    Platform CMS Multi-Tenant Anda sudah optimal. Gunakan fitur AI Assistant di halaman editor untuk bantuan penulisan berita profesional.
                 </p>
                 <div className="pt-4">
                    <Link href="/settings" className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline">
                      Konfigurasi Domain Utama →
                    </Link>
                 </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Activity Feed */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-orange-500">🕒</span> Aktivitas Terbaru
            </h2>
            <ActivityLog activities={activities as any} />
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
              <Link href="/tools" className="text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest">
                Lihat Log Lengkap →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
