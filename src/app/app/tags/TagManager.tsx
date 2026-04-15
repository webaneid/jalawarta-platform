"use client";

import { useState, useTransition } from "react";
import { saveTag, deleteTag } from "@/app/actions/tags";
import { useRouter } from "next/navigation";

type Tag = { id: string; name: string; slug: string };

export default function TagManager({
  tenantId,
  initialTags,
}: {
  tenantId: string;
  initialTags: Tag[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function resetForm() { setName(""); setEditingId(null); setMsg(null); }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setName(tag.name);
    setMsg(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await saveTag({ tenantId, name: name.trim(), existingId: editingId || undefined });
      if (result.success) {
        setMsg(editingId ? "✅ Tag diperbarui!" : "✅ Tag ditambahkan!");
        resetForm();
        router.refresh();
      } else {
        setMsg("❌ " + result.error);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Hapus tag ini?")) return;
    startTransition(async () => {
      await deleteTag(id, tenantId);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Form */}
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {editingId ? "Edit Tag" : "Tambah Tag Baru"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nama Tag</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Misal: AI, Startup, Crypto"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            {msg && <p className="text-sm font-medium text-center">{msg}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending || !name.trim()}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {isPending ? "Menyimpan..." : editingId ? "Simpan" : "Tambah Tag"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Tabel */}
      <div className="lg:col-span-3">
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
              {initialTags.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-400">
                    Belum ada tag. Tambahkan di form kiri.
                  </td>
                </tr>
              )}
              {initialTags.map((tag) => (
                <tr key={tag.id} className={editingId === tag.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      #{tag.name}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400">/{tag.slug}</code>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button onClick={() => startEdit(tag)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400">Edit</button>
                    <button onClick={() => handleDelete(tag.id)} className="text-red-500 hover:text-red-700">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
