import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getContactFormDetail, getFormSubmissions } from "@/app/actions/contact-forms";
import Link from "next/link";
import { formatTenantDate } from "@/lib/dateFormatter";
import InboxClient from "./InboxClient";

export default async function FormInboxPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/login");

  const { id } = await params;
  const { form, success: formSuccess } = await getContactFormDetail(session.tenantId, id);
  const { submissions, success: subSuccess } = await getFormSubmissions(session.tenantId, id);

  if (!formSuccess || !form) {
      redirect("/addons/contact-form");
  }

  const fields = form.fields as any[];

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <Link href="/addons/contact-form" className="text-xs font-bold uppercase tracking-wider hover:underline">Manajer Form</Link>
            <span className="text-gray-400">/</span>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Inbox</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Pesan Masuk: {form.title}</h1>
          <p className="text-sm text-gray-500">Kelola dan baca seluruh aspirasi atau pesan dari pengunjung situs Anda.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-sm overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-900 text-left">
          <thead className="bg-gray-50/50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest min-w-[150px]">Tanggal</th>
              {fields.map(f => (
                <th key={f.id} className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest min-w-[200px]">
                    {f.label}
                </th>
              ))}
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
            <InboxClient 
                tenantId={session.tenantId} 
                submissions={submissions || []} 
                fields={fields} 
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
