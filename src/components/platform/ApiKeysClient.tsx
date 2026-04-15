"use client";

import { useState, useTransition } from "react";
import { saveApiCredential, deleteApiCredential } from "@/app/actions/apikeys";
import { API_CATEGORIES } from "@/lib/api-categories";
import {
  IconKey, IconPlus, IconCheck, IconX, IconTrash,
  IconEye, IconEyeOff, IconShield, IconRefresh, IconChevronDown,
} from "@tabler/icons-react";

interface Credential {
  id: string;
  category: string;
  provider: string;
  displayName: string;
  description: string | null;
  maskedKey: string;
  isActive: boolean | null;
  lastVerifiedAt: Date | null;
  createdAt: Date | null;
}

interface Props {
  credentials: Credential[];
  categories: typeof API_CATEGORIES;
}

const CATEGORY_COLORS: Record<string, string> = {
  ai_text_generation: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  payment_gateway: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  analytics: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  master_pixel: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export default function ApiKeysClient({ credentials, categories }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Credential | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showKeyFor, setShowKeyFor] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const emptyForm = { category: Object.keys(categories)[0], provider: "", apiKey: "", apiSecret: "", displayName: "", description: "", isActive: true };
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => { setEditTarget(null); setForm(emptyForm); setStatusMsg(null); setShowModal(true); };
  const openEdit = (cred: Credential) => {
    setEditTarget(cred);
    setForm({ category: cred.category, provider: cred.provider, apiKey: "", apiSecret: "", displayName: cred.displayName, description: cred.description || "", isActive: cred.isActive ?? true });
    setStatusMsg(null);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.provider || !form.displayName) { setStatusMsg({ type: "error", text: "Provider dan Display Name wajib diisi." }); return; }
    if (!editTarget && !form.apiKey) { setStatusMsg({ type: "error", text: "API Key wajib diisi saat membuat baru." }); return; }
    setStatusMsg(null);
    startTransition(async () => {
      const res = await saveApiCredential({ id: editTarget?.id, ...form });
      if (res.success) {
        setStatusMsg({ type: "success", text: "Kredensial berhasil disimpan!" });
        setTimeout(() => { setShowModal(false); setStatusMsg(null); }, 1200);
      } else {
        setStatusMsg({ type: "error", text: res.error || "Gagal menyimpan." });
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Hapus kredensial "${name}"? Tindakan ini permanen dan dapat memutus Add-on yang bergantung padanya.`)) return;
    startTransition(async () => {
      await deleteApiCredential(id);
    });
  };

  const filtered = filterCategory === "all" ? credentials : credentials.filter(c => c.category === filterCategory);

  const grouped = filtered.reduce((acc, cred) => {
    if (!acc[cred.category]) acc[cred.category] = [];
    acc[cred.category].push(cred);
    return acc;
  }, {} as Record<string, Credential[]>);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-2xl">
            <IconShield className="w-7 h-7 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">API Key Vault</h1>
            <p className="text-gray-500 text-sm mt-0.5">Kredensial tersentralisasi untuk semua Add-on & Modul Jala Warta.</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-500/20 transition-all">
          <IconPlus className="w-5 h-5" /> Tambah Kredensial
        </button>
      </header>

      {/* Category Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCategory("all")} className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${filterCategory === "all" ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900"}`}>
          Semua
        </button>
        {Object.entries(categories).map(([key, cat]) => (
          <button key={key} onClick={() => setFilterCategory(key)} className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${filterCategory === key ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900"}`}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Credentials Grid */}
      {Object.keys(grouped).length === 0 && (
        <div className="py-20 text-center bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
          <IconKey className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">Belum ada kredensial.</p>
          <p className="text-gray-400 text-sm">Klik "+ Tambah Kredensial" untuk mulai menambahkan.</p>
        </div>
      )}

      {Object.entries(grouped).map(([category, creds]) => (
        <section key={category}>
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${CATEGORY_COLORS[category] || "bg-gray-100 text-gray-600"}`}>
              {categories[category]?.label || category}
            </span>
            <div className="h-px bg-gray-100 dark:bg-gray-800 flex-1" />
            <span className="text-xs text-gray-400 font-bold">{creds.length} key</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {creds.map((cred) => (
              <div key={cred.id} className={`group bg-white dark:bg-gray-950 border rounded-2xl p-6 shadow-sm transition-all hover:border-violet-500/40 ${cred.isActive ? "border-gray-200 dark:border-gray-800" : "border-red-200 dark:border-red-900/40 opacity-60"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-base font-black text-gray-900 dark:text-white">{cred.displayName}</p>
                    <p className="text-xs text-gray-400 font-mono uppercase tracking-widest mt-0.5">{cred.provider}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${cred.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-600"}`}>
                    {cred.isActive ? "Active" : "Disabled"}
                  </span>
                </div>

                {/* Masked Key Display */}
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-2">
                  <code className="text-sm font-mono text-gray-600 dark:text-gray-400 tracking-wider">
                    {showKeyFor === cred.id ? cred.maskedKey : "••••••••••••••••••••"}
                  </code>
                  <button onClick={() => setShowKeyFor(showKeyFor === cred.id ? null : cred.id)} className="text-gray-400 hover:text-violet-600 transition-colors">
                    {showKeyFor === cred.id ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>

                {cred.description && (
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">{cred.description}</p>
                )}

                <div className="flex items-center gap-2 pt-4 border-t border-gray-50 dark:border-gray-900">
                  <button onClick={() => openEdit(cred)} className="flex-1 py-2 text-xs font-black uppercase tracking-wider text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950 rounded-lg transition-all">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(cred.id, cred.displayName)} className="py-2 px-3 text-xs font-black text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all">
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-950 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 shadow-2xl">
            <div className="p-6 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconShield className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-black">{editTarget ? "Edit Kredensial" : "Tambah Kredensial Baru"}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><IconX className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5">
              {statusMsg && (
                <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 ${statusMsg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                  {statusMsg.type === "success" ? <IconCheck className="w-4 h-4" /> : <IconX className="w-4 h-4" />}
                  {statusMsg.text}
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kategori</label>
                <select value={form.category} disabled={!!editTarget} onChange={(e) => setForm({ ...form, category: e.target.value, provider: "" })}
                  className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-bold focus:ring-2 focus:ring-violet-500 outline-none disabled:opacity-50">
                  {Object.entries(categories).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Provider */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Provider</label>
                {editTarget ? (
                  <input value={form.provider} disabled className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl font-mono opacity-60" />
                ) : (
                  <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-bold focus:ring-2 focus:ring-violet-500 outline-none">
                    <option value="">— Pilih Provider —</option>
                    {(categories[form.category]?.providers || []).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Tampilan (Display Name)</label>
                <input type="text" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-bold focus:ring-2 focus:ring-violet-500 outline-none"
                  placeholder="cth: Gemini Pro API" />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  API Key {editTarget && <span className="text-gray-300 font-normal normal-case tracking-normal">(kosongkan jika tidak ingin diubah)</span>}
                </label>
                <input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-mono text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                  placeholder={editTarget ? "Biarkan kosong untuk mempertahankan key lama" : "Masukkan API Key..."} />
              </div>

              {/* API Secret (optional) */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  API Secret / Client Secret <span className="text-gray-300 font-normal normal-case tracking-normal">(opsional)</span>
                </label>
                <input type="password" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-mono text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                  placeholder="Bila ada (cth: Client Secret OAuth, DataForSEO password)" />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Catatan Admin</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none"
                  rows={2} placeholder="cth: Tier Free plan di Google Cloud..." />
              </div>

              {/* Active Toggle */}
              <label className="flex items-center gap-3 cursor-pointer group pt-2">
                <div className="relative">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-gray-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 dark:text-white">Aktif & siap digunakan</p>
                  <p className="text-[10px] text-gray-500">Jika dinonaktifkan, Add-on yang bergantung akan gagal terhubung.</p>
                </div>
              </label>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-900 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-gray-200 dark:border-gray-800 text-gray-500 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">Batal</button>
              <button onClick={handleSave} disabled={isPending} className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-black shadow-lg shadow-violet-500/20 disabled:opacity-50 transition-all flex items-center gap-2">
                {isPending ? <><IconRefresh className="w-4 h-4 animate-spin" /> Menyimpan...</> : <><IconCheck className="w-4 h-4" /> Simpan</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
