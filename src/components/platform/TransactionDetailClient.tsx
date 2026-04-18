"use client";

import { useState } from "react";
import Link from "next/link";
import { markTransactionPaid, cancelTransaction } from "@/app/actions/platform";
import { useRouter } from "next/navigation";

type Tx = {
  id: string;
  invoiceNumber: string;
  amount: number;
  periodMonths: number | null;
  paymentMethod: string | null;
  status: string;
  paymentProof: string | null;
  paymentNotes: string | null;
  dueDate: Date | null;
  paidAt: Date | null;
  createdAt: Date | null;
  tenantId: string;
  tenant: { siteName: string | null; subdomain: string } | null;
  package: { name: string; price: number } | null;
  paymentMethodRef: { label: string; bankName: string | null; accountNumber: string | null } | null;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  AWAITING_VERIFICATION: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  EXPIRED: "bg-red-100 text-red-600",
  CANCELLED: "bg-gray-100 text-gray-400",
};

export default function TransactionDetailClient({ tx }: { tx: Tx }) {
  const router = useRouter();
  const [notes, setNotes] = useState(tx.paymentNotes || "");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canVerify = tx.status === "PENDING" || tx.status === "AWAITING_VERIFICATION";
  const canCancel = tx.status === "PENDING" || tx.status === "AWAITING_VERIFICATION";

  async function handlePaid() {
    if (!confirm("Tandai transaksi ini sebagai LUNAS?")) return;
    setSaving(true);
    const res = await markTransactionPaid(tx.id, notes);
    if (!res.success) { setErrorMsg((res as any).error || "Gagal."); setSaving(false); return; }
    router.refresh();
    setSaving(false);
  }

  async function handleCancel() {
    if (!confirm("Batalkan transaksi ini?")) return;
    setSaving(true);
    const res = await cancelTransaction(tx.id);
    if (!res.success) { setErrorMsg((res as any).error || "Gagal."); setSaving(false); return; }
    router.refresh();
    setSaving(false);
  }

  const fmt = (d: Date | null) => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";

  return (
    <div className="space-y-4">
      <Link href="/platform/transactions" className="text-xs text-gray-400 hover:text-purple-600 transition-colors">← Kembali ke Transaksi</Link>

      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${STATUS_BADGE[tx.status] ?? STATUS_BADGE.PENDING}`}>
              {tx.status}
            </span>
            <span className="text-xs text-gray-400 font-mono">{fmt(tx.createdAt)}</span>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Tenant</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                <Link href={`/platform/tenants/${tx.tenantId}`} className="hover:text-purple-600">
                  {tx.tenant?.siteName || tx.tenant?.subdomain || "—"}
                </Link>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Paket</p>
              <p className="font-semibold text-gray-900 dark:text-white">{tx.package?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Jumlah</p>
              <p className="font-black text-xl text-gray-900 dark:text-white">Rp {tx.amount.toLocaleString("id-ID")}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Durasi</p>
              <p className="font-semibold text-gray-900 dark:text-white">{tx.periodMonths ?? 1} Bulan</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Metode Bayar</p>
              <p className="font-semibold text-gray-900 dark:text-white capitalize">{tx.paymentMethod?.replace("_", " ") ?? "—"}</p>
              {tx.paymentMethodRef && (
                <p className="text-xs text-gray-500">{tx.paymentMethodRef.label} {tx.paymentMethodRef.accountNumber ? `· ${tx.paymentMethodRef.accountNumber}` : ""}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Jatuh Tempo</p>
              <p className="font-semibold text-gray-900 dark:text-white">{fmt(tx.dueDate)}</p>
            </div>
            {tx.paidAt && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Dibayar</p>
                <p className="font-semibold text-green-600">{fmt(tx.paidAt)}</p>
              </div>
            )}
          </div>

          {/* Bukti bayar */}
          {tx.paymentProof && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Bukti Pembayaran</p>
              <a href={tx.paymentProof} target="_blank" rel="noopener noreferrer">
                <img src={tx.paymentProof} alt="Bukti bayar" className="max-w-xs rounded-xl border border-gray-200 dark:border-gray-800 hover:opacity-90 transition-opacity" />
              </a>
            </div>
          )}

          {/* Catatan verifikasi */}
          {canVerify && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Catatan Verifikasi</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opsional: catatan untuk rekap pembayaran..."
              />
            </div>
          )}

          {tx.paymentNotes && tx.status === "PAID" && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-0.5">Catatan Admin</p>
              <p className="text-sm text-green-700 dark:text-green-400">{tx.paymentNotes}</p>
            </div>
          )}

          {errorMsg && <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>}
        </div>

        {/* Actions */}
        {(canVerify || canCancel) && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 justify-end">
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
              >
                Batalkan
              </button>
            )}
            {canVerify && (
              <button
                onClick={handlePaid}
                disabled={saving}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
              >
                {saving ? "Memproses..." : "✓ Tandai Lunas"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
