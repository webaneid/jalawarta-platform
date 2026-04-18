"use client";

import { useState } from "react";
import {
  addPlatformPaymentMethod,
  togglePlatformPaymentMethod,
  deletePlatformPaymentMethod,
} from "@/app/actions/platform";
import { IconBuildingBank, IconQrcode, IconPlus, IconTrash, IconToggleRight, IconToggleLeft, IconX } from "@tabler/icons-react";

type Method = {
  id: string;
  type: string;
  label: string;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  qrisImage: string | null;
  qrisProvider: string | null;
  isActive: boolean | null;
  sortOrder: number | null;
};

type ModalType = "bank" | "qris" | null;

export default function PaymentMethodsClient({ methods: initialMethods }: { methods: Method[] }) {
  const [methods, setMethods] = useState<Method[]>(initialMethods);
  const [modal, setModal] = useState<ModalType>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    label: "", bankName: "", accountNumber: "", accountName: "",
    qrisProvider: "", qrisImage: "",
  });

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    const res = await addPlatformPaymentMethod({
      type: modal === "bank" ? "bank_transfer" : "qris",
      label: form.label,
      ...(modal === "bank"
        ? { bankName: form.bankName, accountNumber: form.accountNumber, accountName: form.accountName }
        : { qrisProvider: form.qrisProvider, qrisImage: form.qrisImage }),
    });
    if (!res.success) {
      setErrorMsg(res.error || "Gagal menambahkan.");
    } else {
      // Optimistic: reload via router would be cleaner but we just push a stub
      setMethods((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: modal === "bank" ? "bank_transfer" : "qris",
          label: form.label,
          bankName: form.bankName || null,
          accountNumber: form.accountNumber || null,
          accountName: form.accountName || null,
          qrisImage: form.qrisImage || null,
          qrisProvider: form.qrisProvider || null,
          isActive: true,
          sortOrder: prev.length,
        },
      ]);
      setModal(null);
      setForm({ label: "", bankName: "", accountNumber: "", accountName: "", qrisProvider: "", qrisImage: "" });
    }
    setSaving(false);
  }

  async function handleToggle(id: string, current: boolean | null) {
    const newVal = !current;
    setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, isActive: newVal } : m)));
    await togglePlatformPaymentMethod(id, newVal);
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus metode pembayaran ini?")) return;
    setMethods((prev) => prev.filter((m) => m.id !== id));
    await deletePlatformPaymentMethod(id);
  }

  const inputCls = "w-full px-3 py-2 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none";

  return (
    <>
      <div className="space-y-4">
        {/* Action bar */}
        <div className="flex gap-3">
          <button
            onClick={() => setModal("bank")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
          >
            <IconBuildingBank className="w-4 h-4" /> Tambah Rekening Bank
          </button>
          <button
            onClick={() => setModal("qris")}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
          >
            <IconQrcode className="w-4 h-4" /> Tambah QRIS
          </button>
        </div>

        {/* List */}
        {methods.length === 0 ? (
          <div className="py-16 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
            <IconBuildingBank className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Belum ada metode pembayaran. Tambahkan rekening atau QRIS.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map((m) => (
              <div
                key={m.id}
                className={`flex items-center justify-between p-4 bg-white dark:bg-gray-950 border rounded-2xl shadow-sm transition-opacity ${
                  m.isActive ? "border-gray-200 dark:border-gray-800" : "border-gray-100 dark:border-gray-900 opacity-50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-center">
                    {m.type === "qris" ? (
                      <IconQrcode className="w-5 h-5 text-purple-500" />
                    ) : (
                      <IconBuildingBank className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{m.label}</p>
                    {m.type === "bank_transfer" ? (
                      <p className="text-xs text-gray-500">{m.bankName} · {m.accountNumber} · a.n. {m.accountName}</p>
                    ) : (
                      <p className="text-xs text-gray-500">QRIS {m.qrisProvider ?? ""}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.isActive ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-400"}`}>
                    {m.isActive ? "AKTIF" : "NONAKTIF"}
                  </span>
                  <button onClick={() => handleToggle(m.id, m.isActive)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400">
                    {m.isActive ? <IconToggleRight className="w-5 h-5 text-green-500" /> : <IconToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-gray-400 hover:text-red-500">
                    <IconTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                {modal === "bank" ? "Tambah Rekening Bank" : "Tambah QRIS"}
              </h2>
              <button onClick={() => { setModal(null); setErrorMsg(""); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                <IconX className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Label <span className="text-red-500">*</span></label>
                <input name="label" value={form.label} onChange={handleFormChange} required placeholder={modal === "bank" ? "BCA Utama" : "QRIS GoPay Jala Warta"} className={inputCls} />
              </div>

              {modal === "bank" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nama Bank <span className="text-red-500">*</span></label>
                    <select name="bankName" value={form.bankName} onChange={handleFormChange} required className={inputCls}>
                      <option value="">Pilih Bank</option>
                      {["BCA","Mandiri","BNI","BRI","BSI","CIMB Niaga","BTN","Permata","Danamon","Lainnya"].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">No. Rekening <span className="text-red-500">*</span></label>
                    <input name="accountNumber" value={form.accountNumber} onChange={handleFormChange} required placeholder="1234567890" className={`${inputCls} font-mono`} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Atas Nama <span className="text-red-500">*</span></label>
                    <input name="accountName" value={form.accountName} onChange={handleFormChange} required placeholder="Nama Pemilik Rekening" className={inputCls} />
                  </div>
                </>
              )}

              {modal === "qris" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Provider QRIS</label>
                    <input name="qrisProvider" value={form.qrisProvider} onChange={handleFormChange} placeholder="GoPay, DANA, Universal QRIS..." className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">URL Gambar QRIS</label>
                    <input name="qrisImage" value={form.qrisImage} onChange={handleFormChange} placeholder="https://..." className={inputCls} />
                    <p className="text-[10px] text-gray-400 mt-1">Upload gambar QRIS ke Media Library terlebih dahulu, lalu paste URL-nya di sini.</p>
                  </div>
                </>
              )}

              {errorMsg && <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setModal(null); setErrorMsg(""); }} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold">
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
