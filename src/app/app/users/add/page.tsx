import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import AddUserForm from "./add-user-form";

export default async function AddMemberPage() {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/login");
  const tenantId = session.tenantId;

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <div className="mb-8">
        <Link 
          href="/users" 
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Kembali ke Daftar Anggota
        </Link>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Tambah Anggota Tim</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Undang rekan kerja Anda untuk berkolaborasi mengelola portal berita.</p>
      </div>

      {/* Render form as a client component and pass server-side tenantId */}
      <AddUserForm tenantId={tenantId} />
    </div>
  );
}
