import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getContactFormDetail } from "@/app/actions/contact-forms";
import Link from "next/link";
import FormBuilder from "../builder/FormBuilder";

type ContactFormInitialData = {
  title: string;
  fields: any[];
  settings: any;
};

export default async function ContactFormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/login");

  const { id } = await params;
  const isNew = id === "new";
  
  let initialData: ContactFormInitialData = {
    title: "",
    fields: [],
    settings: {
        successMessage: "Terima kasih! Pesan Anda telah terkirim.",
        submitButtonText: "Kirim Pesan",
        emailNotification: ""
    }
  };

  if (!isNew) {
    const { form, success, error } = await getContactFormDetail(session.tenantId, id);
    if (!success || !form) {
       return (
            <div className="p-12 text-center">
                <h1 className="text-xl font-bold text-red-500">Error</h1>
                <p className="text-gray-500">{error || "Form tidak ditemukan"}</p>
                <Link href="/addons/contact-form" className="text-blue-600 hover:underline mt-4 inline-block">Kembali</Link>
            </div>
       );
    }
    initialData = {
        title: form.title,
        fields: form.fields as any[],
        settings: form.settings as any
    };
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link 
            href="/addons/contact-form"
            className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 transition-all font-bold"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </Link>
            <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isNew ? "Buat Formulir Baru" : `Edit: ${initialData.title}`}
            </h1>
            <p className="text-sm text-gray-500">Gunakan editor visual untuk menyusun formulir Anda.</p>
            </div>
        </div>
      </div>

      <FormBuilder 
        tenantId={session.tenantId} 
        formId={isNew ? undefined : id} 
        initialData={initialData} 
        isNew={isNew}
      />
    </div>
  );
}
