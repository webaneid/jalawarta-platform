"use client";

import { deleteSubmissionAction } from "@/app/actions/contact-forms";
import { formatTenantDate } from "@/lib/dateFormatter";
import { useRouter } from "next/navigation";

export default function InboxClient({ 
    tenantId, 
    submissions, 
    fields 
}: { 
    tenantId: string; 
    submissions: any[]; 
    fields: any[];
}) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Hapus pesan ini secara permanen?")) return;
    const res = await deleteSubmissionAction(tenantId, id);
    if (res.success) {
      router.refresh();
    } else {
      alert("Error: " + res.error);
    }
  }

  if (submissions.length === 0) {
    return (
      <tr>
        <td colSpan={fields.length + 2} className="px-6 py-20 text-center">
            <div className="flex flex-col items-center gap-3 grayscale opacity-50">
                <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                <p className="text-gray-500 font-medium">Inbox kosong.</p>
            </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      {submissions.map((sub) => (
        <tr 
            key={sub.id} 
            className={`group transition-colors ${sub.status === 'UNREAD' ? 'bg-blue-50/30 dark:bg-blue-900/5' : 'hover:bg-gray-50 dark:hover:bg-gray-900/20'}`}
        >
          <td className="px-6 py-5 whitespace-nowrap">
             <div className="text-xs font-bold text-gray-600 dark:text-gray-400">
                {formatTenantDate(sub.createdAt)}
             </div>
             {sub.status === 'UNREAD' && (
                <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full ml-1" />
             )}
          </td>
          
          {fields.map((f) => (
            <td key={f.id} className="px-6 py-5">
               <div className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 max-w-xs xl:max-w-md">
                   {sub.data[f.id] || <span className="text-gray-300 italic">-</span>}
               </div>
            </td>
          ))}

          <td className="px-6 py-5 text-right">
             <button
                onClick={() => handleDelete(sub.id)}
                className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                title="Hapus Pesan"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
          </td>
        </tr>
      ))}
    </>
  );
}
