"use client";

import { IconPlug, IconCheck, IconSearch, IconPlugConnected, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { registerPlugin } from "@/app/actions/platform";

type Addon = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date | null;
};

export default function AddonsClient({ addons: initialAddons }: { addons: Addon[] }) {
  const [addons, setAddons] = useState<Addon[]>(initialAddons);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({ id: "", name: "", description: "" });

  const filtered = addons.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // Auto-generate ID slug dari name jika user belum edit ID manual
      ...(name === "name" && !form.id
        ? { id: value.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "") }
        : {}),
    }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!form.id || !form.name) return;
    setSaving(true);
    setErrorMsg("");
    const res = await registerPlugin(form);
    if (!res.success) {
      setErrorMsg(res.error || "Gagal mendaftarkan plugin.");
    } else {
      setAddons((prev) => [
        { id: form.id, name: form.name, description: form.description || null, createdAt: new Date() },
        ...prev,
      ]);
      setShowModal(false);
      setForm({ id: "", name: "", description: "" });
    }
    setSaving(false);
  }

  return (
    <>
      <div className="space-y-6">
        {/* Search & Action Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari add-on..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
          >
            <IconPlugConnected className="w-4 h-4" />
            Daftarkan Plugin Baru
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((addon) => (
            <div
              key={addon.id}
              className="group p-6 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:border-orange-400/60 transition-all relative"
            >
              <div className="absolute top-4 right-4">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                  Add-on
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/30 flex items-center justify-center mb-4">
                <IconPlug className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{addon.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-1">{addon.description || "—"}</p>
              <p className="text-[10px] text-gray-400 font-mono mb-4">{addon.id}</p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <IconCheck className="w-3 h-3" /> Terdaftar
                </div>
                <a
                  href={`/platform/addons/${addon.id}`}
                  className="text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-purple-600 transition-colors"
                >
                  Detail & Config →
                </a>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
              <IconPlug className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Tidak ada add-on yang cocok.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Register Plugin */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Daftarkan Plugin Baru</h2>
              <button
                onClick={() => { setShowModal(false); setErrorMsg(""); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Plugin ID <span className="text-red-500">*</span>
                </label>
                <input
                  name="id"
                  value={form.id}
                  onChange={handleFormChange}
                  placeholder="contoh: advanced-seo"
                  required
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-sm font-mono text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">Slug unik, huruf kecil, gunakan tanda hubung.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nama Plugin <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="contoh: Advanced SEO Manager"
                  required
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Deskripsi
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Jelaskan fungsi plugin ini..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setErrorMsg(""); }}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.id || !form.name}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  {saving ? "Mendaftarkan..." : "Daftarkan Plugin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
