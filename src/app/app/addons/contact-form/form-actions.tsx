"use client";

import { useState } from "react";
import { deleteContactFormAction } from "@/app/actions/contact-forms";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function FormActions({ 
  tenantId, 
  formId 
}: { 
  tenantId: string; 
  formId: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Hapus formulir ini secara permanen? Seluruh pesan masuk yang terkait juga akan dihapus.")) return;
    setLoading(true);
    const res = await deleteContactFormAction(tenantId, formId);
    if (res.success) {
      router.refresh();
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/addons/contact-form/${formId}`}
        className="p-2 text-gray-500 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 rounded-xl transition-all font-bold text-xs flex items-center gap-2"
        title="Edit Form"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        Edit
      </Link>
      
      <button
        disabled={loading}
        onClick={handleDelete}
        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all disabled:opacity-50"
        title="Delete Form"
      >
         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  );
}
