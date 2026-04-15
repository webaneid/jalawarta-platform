import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getContactForms } from "@/app/actions/contact-forms";
import Link from "next/link";
import { formatTenantDate } from "@/lib/dateFormatter";
import FormActions from "./form-actions";

export default async function ContactFormListPage() {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/login");

  const { forms, error } = await getContactForms(session.tenantId);

  return (
    <div className="max-w-6xl mx-auto py-8 px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <Link href="/addons" className="text-xs font-bold uppercase tracking-wider hover:underline">Add-ons</Link>
            <span className="text-gray-400">/</span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Contact Form</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Manajer Formulir</h1>
          <p className="text-gray-500 dark:text-gray-400">Buat dan kelola formulir kontak kustom untuk tenant Anda.</p>
        </div>
        <Link 
          href="/addons/contact-form/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95 group"
        >
          <svg className="w-5 h-5 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Buat Form Baru
        </Link>
      </div>

      {error && (
        <div className="p-4 mb-8 bg-red-100 border border-red-200 text-red-700 rounded-2xl">
          Error: {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-900 text-left">
          <thead className="bg-gray-50/50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Judul & Shortcode</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Field</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Pesan Masuk</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Dibuat</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
            {forms?.map((form) => (
              <tr key={form.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                <td className="px-6 py-5">
                  <div className="font-bold text-gray-900 dark:text-white mb-1">{form.title}</div>
                  <code className="text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">
                    {`[contact-form id="${form.id}"]`}
                  </code>
                </td>
                <td className="px-6 py-5 text-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                    {Array.isArray(form.fields) ? form.fields.length : 0} Field
                  </span>
                </td>
                <td className="px-6 py-5 text-center">
                  <Link 
                    href={`/addons/contact-form/${form.id}/inbox`}
                    className="text-sm font-bold text-blue-600 hover:underline"
                  >
                    Lihat Inbox
                  </Link>
                </td>
                <td className="px-6 py-5 text-sm text-gray-500 whitespace-nowrap">
                   {formatTenantDate(form.createdAt)}
                </td>
                <td className="px-6 py-5 text-right">
                   <FormActions tenantId={session.tenantId!} formId={form.id} />
                </td>
              </tr>
            ))}
            {forms?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center">
                   <div className="flex flex-col items-center gap-3 grayscale opacity-50">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <p className="text-gray-500 font-medium">Belum ada formulir yang dibuat.</p>
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
