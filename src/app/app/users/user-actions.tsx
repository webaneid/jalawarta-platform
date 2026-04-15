"use client";

import { useState } from "react";
import { updateMemberRoleAction, deleteUserAction, toggleUserStatusAction } from "@/app/actions/users";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UserActions({ 
  memberId, 
  currentRole, 
  tenantId,
  isActive
}: { 
  memberId: string; 
  currentRole: string; 
  tenantId: string;
  isActive: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const roles = ["SUPER_ADMIN", "EDITOR", "WRITER", "SUBSCRIBER"];

  async function handleRoleChange(newRole: string) {
    if (newRole === currentRole) return;
    setLoading(true);
    const res = await updateMemberRoleAction(memberId, tenantId, newRole);
    if (res.success) {
      router.refresh();
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  }

  async function handleToggleStatus() {
    setLoading(true);
    const res = await toggleUserStatusAction(memberId);
    if (res.success) {
      router.refresh();
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  }

  async function handleRemove() {
    if (!confirm("Hapus pengguna ini secara permanen dari sistem? PERINGATAN: Ini hanya bisa dilakukan jika user belum memiliki konten.")) return;
    setLoading(true);
    const res = await deleteUserAction(memberId);
    if (res.success) {
      router.refresh();
    } else {
      alert("Error: " + res.error);
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {/* View/Edit Link */}
      <Link
        href={`/users/${memberId}`}
        className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
        title="View/Edit Details"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      </Link>

      {/* Role Select */}
      <select 
        disabled={loading}
        value={currentRole}
        onChange={(e) => handleRoleChange(e.target.value)}
        className="text-xs font-bold border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
      >
        {roles.map(r => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      {/* Toggle Status (Sesuai masukan "nonaktifkan user") */}
      <button
        disabled={loading}
        onClick={handleToggleStatus}
        className={`p-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50 ${
          isActive 
            ? "text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" 
            : "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
        }`}
        title={isActive ? "Nonaktifkan User" : "Aktifkan User"}
      >
        {isActive ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
        )}
      </button>

      {/* Safe Delete */}
      <button 
        disabled={loading}
        onClick={handleRemove}
        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all active:scale-95 disabled:opacity-50"
        title="Remove Permanently"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  );
}
