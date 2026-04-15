import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getUserDetailAction } from "@/app/actions/users";
import Link from "next/link";
import EditUserForm from "./edit-form";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const { user, error, success } = await getUserDetailAction(id);

  if (!success || !user) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold text-red-500">Error</h1>
        <p className="text-gray-500">{error || "Pengguna tidak ditemukan."}</p>
        <Link href="/users" className="text-blue-500 hover:underline mt-4 inline-block">Kembali ke Daftar User</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="mb-8 flex items-center gap-4">
        <Link 
          href="/users"
          className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Detail Pengguna</h1>
          <p className="text-sm text-gray-500">Kelola profil dan pengaturan keamanan akun.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        <div className="space-y-6">
          <EditUserForm user={user} />
        </div>

        <div className="space-y-6">
          {/* Stats Card */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Statistik Kontribusi</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900">
                <span className="text-sm text-blue-700 dark:text-blue-400 font-medium">Total Artikel</span>
                <span className="text-lg font-bold text-blue-800 dark:text-blue-300">{user.stats.posts}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900">
                <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">Total Halaman</span>
                <span className="text-lg font-bold text-emerald-800 dark:text-emerald-300">{user.stats.pages}</span>
              </div>
            </div>
            <p className="mt-4 text-[10px] text-gray-400 leading-relaxed italic">
              * Pengguna tidak dapat dihapus jika memiliki kontribusi konten aktif untuk menjaga integritas database.
            </p>
          </div>

          {/* Account Status Card */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Status Akun</h3>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${user.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-sm font-bold ${user.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                {user.isActive ? "Aktif & Bisa Login" : "Dinonaktifkan"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
