"use client";

import { useState, useTransition } from "react";
import { setPlatformCreditLimit } from "@/app/actions/ai-generate";
import { IconCoins, IconEdit, IconCheck } from "@tabler/icons-react";

export default function PlatformAiConfigClient({
  tenants,
}: {
  tenants: any[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState<number>(0);
  const [localTenants, setLocalTenants] = useState(tenants);

  const handleEditClick = (t: any) => {
    setEditingId(t.tenantId);
    setEditLimit(t.aiCreditsLimit);
  };

  const handleSave = (tenantId: string) => {
    startTransition(async () => {
      const res = await setPlatformCreditLimit(tenantId, editLimit);
      if (res.success) {
        setLocalTenants(prev => prev.map(t => t.tenantId === tenantId ? { ...t, aiCreditsLimit: editLimit } : t));
        setEditingId(null);
      } else {
        alert("Gagal menyimpan: " + res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">Alokasi AI per Tenant</h3>
                <p className="text-xs text-gray-500 mt-1">Gunakan tabel ini untuk menambah atau memperbarui batas limit token yang diizinkan untuk setiap penyewa.</p>
            </div>
            
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase tracking-widest text-[10px] font-black">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Tenant</th>
                <th className="px-4 py-3">Status Add-on</th>
                <th className="px-4 py-3">Batas Kredit</th>
                <th className="px-4 py-3">Terpakai</th>
                <th className="px-4 py-3 rounded-r-xl">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
              {localTenants.map((t) => (
                <tr key={t.tenantId} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                  <td className="px-4 py-4">
                    <p className="font-bold text-gray-900 dark:text-white">{t.siteName}</p>
                    <p className="text-xs text-gray-400">ID: {t.tenantId.slice(0,8)}...</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex px-2 py-1 text-[10px] font-bold rounded-lg uppercase ${
                        t.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {editingId === t.tenantId ? (
                      <input 
                        type="number"
                        min="0"
                        value={editLimit}
                        onChange={e => setEditLimit(Number(e.target.value))}
                        className="w-24 px-2 py-1 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 outline-none"
                      />
                    ) : (
                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{t.aiCreditsLimit}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-gray-600 dark:text-gray-400">{t.aiCreditsUsed}</span>
                  </td>
                  <td className="px-4 py-4">
                    {editingId === t.tenantId ? (
                      <button 
                        disabled={isPending}
                        onClick={() => handleSave(t.tenantId)}
                        className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                      >
                        {isPending ? <span className="w-4 h-4 border-2 border-green-700 border-t-transparent rounded-full animate-spin"></span> : <IconCheck className="w-4 h-4" />}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleEditClick(t)}
                        className="p-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center"
                      >
                        <IconEdit className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {localTenants.length === 0 && (
                <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">Belum ada tenant yang mengaktifkan AI Generator.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
