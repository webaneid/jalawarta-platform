import Link from "next/link";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deletePageAction } from "@/app/actions/pages";
import DeletePageButton from "@/components/DeletePageButton";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function PagesIndex() {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/login");
  const tenantId = session.tenantId;

  const allPages = await db.select().from(pages).where(eq(pages.tenantId, tenantId));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Halaman</h1>
          <p className="text-sm text-gray-500">{allPages.length} halaman tersimpan.</p>
        </div>
        <Link
          href="/pages/editor"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Buat Halaman Baru
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Judul</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
            {allPages.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <p className="text-sm text-gray-400">Belum ada halaman. Klik "Buat Halaman Baru" untuk memulai.</p>
                </td>
              </tr>
            )}
            {allPages.map((page) => {
              const title = typeof page.title === "object" && page.title !== null
                ? (page.title as any).id || "Tanpa Judul"
                : String(page.title || "Tanpa Judul");
              return (
                <tr key={page.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400">/{page.slug}</code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Aktif
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap space-x-4">
                    <Link href={`/pages/editor?id=${page.id}`} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm font-medium">Edit</Link>
                    <DeletePageButton id={page.id} tenantId={tenantId} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
