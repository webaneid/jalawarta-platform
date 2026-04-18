"use client";

import { useState } from "react";
import Link from "next/link";
import { createTransaction } from "@/app/actions/platform";
import { IconPlus, IconX, IconReceipt } from "@tabler/icons-react";

type Tx = {
  id: string;
  invoiceNumber: string;
  amount: number;
  periodMonths: number | null;
  paymentMethod: string | null;
  status: string;
  dueDate: Date | null;
  paidAt: Date | null;
  createdAt: Date | null;
  tenantId: string;
  tenantName: string | null;
  tenantSubdomain: string | null;
  packageName: string | null;
};

type PaymentMethod = { id: string; label: string; type: string };
type TenantOption = { id: string; siteName: string | null; subdomain: string };
type PackageOption = { id: string; name: string; price: number };

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  AWAITING_VERIFICATION: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  EXPIRED: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-600",
};

const STATUS_FILTER = ["ALL", "PENDING", "AWAITING_VERIFICATION", "PAID", "EXPIRED", "CANCELLED"];

export default function TransactionsClient({
  transactions,
  paymentMethods,
  tenants,
  packages,
}: {
  transactions: Tx[];
  paymentMethods: PaymentMethod[];
  tenants: TenantOption[];
  packages: PackageOption[];
}) {
  const [txList, setTxList] = useState<Tx[]>(transactions);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    tenantId: tenants[0]?.id ?? "",
    packageId: packages[0]?.id ?? "",
    periodMonths: 1,
    amount: packages[0]?.price ?? 0,
    paymentMethod: "bank_transfer" as "bank_transfer" | "qris" | "gateway",
    paymentMethodId: paymentMethods[0]?.id ?? "",
  });

  const filtered = statusFilter === "ALL" ? txList : txList.filter((t) => t.status === statusFilter);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((p) => {
      const updated = { ...p, [name]: name === "periodMonths" || name === "amount" ? Number(value) : value };
      // Auto-fill amount from package
      if (name === "packageId") {
        const pkg = packages.find((pk) => pk.id === value);
        if (pkg) updated.amount = pkg.price;
      }
      return updated;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    const res = await createTransaction({
      tenantId: form.tenantId,
      packageId: form.packageId,
      periodMonths: form.periodMonths,
      amount: form.amount,
      paymentMethod: form.paymentMethod,
      paymentMethodId: form.paymentMethod !== "gateway" ? form.paymentMethodId : undefined,
    });
    if (!res.success) {
      setErrorMsg(res.error || "Gagal membuat tagihan.");
    } else {
      const tenant = tenants.find((t) => t.id === form.tenantId);
      const pkg = packages.find((p) => p.id === form.packageId);
      setTxList((prev) => [
        {
          id: crypto.randomUUID(),
          invoiceNumber: res.invoiceNumber ?? "",
          amount: form.amount,
          periodMonths: form.periodMonths,
          paymentMethod: form.paymentMethod,
          status: "PENDING",
          dueDate: null,
          paidAt: null,
          createdAt: new Date(),
          tenantId: form.tenantId,
          tenantName: tenant?.siteName ?? null,
          tenantSubdomain: tenant?.subdomain ?? null,
          packageName: pkg?.name ?? null,
        },
        ...prev,
      ]);
      setShowModal(false);
    }
    setSaving(false);
  }

  const inputCls = "w-full px-3 py-2 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none";

  return (
    <>
      <div className="space-y-4">
        {/* Filter + action bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTER.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                  statusFilter === s
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-purple-400"
                }`}
              >
                {s === "ALL" ? `Semua (${txList.length})` : s}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors whitespace-nowrap"
          >
            <IconPlus className="w-4 h-4" /> Buat Tagihan
          </button>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center bg-gray-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800">
            <IconReceipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Belum ada transaksi.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Tenant</th>
                  <th className="px-4 py-3 text-left">Paket</th>
                  <th className="px-4 py-3 text-right">Jumlah</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-900">
                {filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{tx.invoiceNumber}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 dark:text-white text-xs">{tx.tenantName || tx.tenantSubdomain}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{tx.packageName ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white text-xs">
                      Rp {tx.amount.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[tx.status] ?? STATUS_BADGE.PENDING}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/platform/transactions/${tx.id}`} className="text-[10px] font-bold text-purple-600 hover:text-purple-700">
                        Detail →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Buat Tagihan */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Buat Tagihan Baru</h2>
              <button onClick={() => { setShowModal(false); setErrorMsg(""); }} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <IconX className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tenant <span className="text-red-500">*</span></label>
                <select name="tenantId" value={form.tenantId} onChange={handleFormChange} required className={inputCls}>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.siteName || t.subdomain}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Paket <span className="text-red-500">*</span></label>
                  <select name="packageId" value={form.packageId} onChange={handleFormChange} required className={inputCls}>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Durasi (Bulan)</label>
                  <input name="periodMonths" type="number" min={1} max={24} value={form.periodMonths} onChange={handleFormChange} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Jumlah (Rp) <span className="text-red-500">*</span></label>
                <input name="amount" type="number" min={0} value={form.amount} onChange={handleFormChange} className={`${inputCls} font-mono`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Metode Pembayaran</label>
                <select name="paymentMethod" value={form.paymentMethod} onChange={handleFormChange} className={inputCls}>
                  <option value="bank_transfer">Transfer Bank</option>
                  <option value="qris">QRIS</option>
                  <option value="gateway">Payment Gateway</option>
                </select>
              </div>
              {form.paymentMethod !== "gateway" && paymentMethods.filter((m) => m.type === (form.paymentMethod === "bank_transfer" ? "bank_transfer" : "qris")).length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Rekening / QRIS Platform</label>
                  <select name="paymentMethodId" value={form.paymentMethodId} onChange={handleFormChange} className={inputCls}>
                    <option value="">— Pilih —</option>
                    {paymentMethods
                      .filter((m) => m.type === (form.paymentMethod === "bank_transfer" ? "bank_transfer" : "qris"))
                      .map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                  </select>
                </div>
              )}
              {errorMsg && <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => { setShowModal(false); setErrorMsg(""); }} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold">
                  {saving ? "Membuat..." : "Buat Tagihan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
