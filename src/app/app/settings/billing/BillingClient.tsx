"use client";

import { useState } from "react";
import { uploadPaymentProof } from "@/app/actions/settings";
import MediaLibrary from "@/components/MediaLibrary";
import { useRouter } from "next/navigation";
import { IconReceipt, IconBuildingBank, IconQrcode, IconUpload } from "@tabler/icons-react";

type Tx = {
  id: string;
  invoiceNumber: string;
  amount: number;
  periodMonths: number | null;
  paymentMethod: string | null;
  status: string;
  paymentProof: string | null;
  dueDate: Date | null;
  paidAt: Date | null;
  createdAt: Date | null;
};

type PaymentMethod = {
  id: string;
  type: string;
  label: string;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  qrisImage: string | null;
  qrisProvider: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  AWAITING_VERIFICATION: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  EXPIRED: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED: "bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-600",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Menunggu Pembayaran",
  AWAITING_VERIFICATION: "Menunggu Verifikasi",
  PAID: "Lunas",
  EXPIRED: "Kadaluarsa",
  CANCELLED: "Dibatalkan",
};

export default function BillingClient({
  transactions,
  paymentMethods,
  tenantId,
}: {
  transactions: Tx[];
  paymentMethods: PaymentMethod[];
  tenantId: string;
}) {
  const router = useRouter();
  const [uploadTarget, setUploadTarget] = useState<string | null>(null); // transactionId
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isLibraryOpen, setLibraryOpen] = useState(false);

  async function handleUploadProof(txId: string, url: string) {
    setUploading(true);
    setStatusMsg(null);
    const res = await uploadPaymentProof(txId, url);
    if (res.success) {
      setStatusMsg("✅ Bukti pembayaran berhasil dikirim. Admin akan memverifikasi dalam 1x24 jam.");
      router.refresh();
    } else {
      setStatusMsg("❌ " + (res.error || "Gagal upload bukti."));
    }
    setUploading(false);
    setUploadTarget(null);
    setLibraryOpen(false);
  }

  function openUpload(txId: string) {
    setUploadTarget(txId);
    setLibraryOpen(true);
  }

  const fmt = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";

  const bankMethods = paymentMethods.filter((m) => m.type === "bank_transfer");
  const qrisMethods = paymentMethods.filter((m) => m.type === "qris");

  return (
    <>
      <div className="space-y-6">
        {statusMsg && (
          <div className={`px-4 py-3 rounded-xl text-sm font-semibold ${statusMsg.startsWith("✅") ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"}`}>
            {statusMsg}
          </div>
        )}

        {/* Cara Pembayaran Platform */}
        {paymentMethods.length > 0 && (
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cara Pembayaran Subscription</h2>

            {bankMethods.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5"><IconBuildingBank className="w-3.5 h-3.5" /> Transfer Bank</p>
                {bankMethods.map((m) => (
                  <div key={m.id} className="bg-gray-50 dark:bg-gray-900 rounded-xl px-4 py-3">
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{m.bankName} — {m.label}</p>
                    <p className="text-sm font-mono font-black text-gray-900 dark:text-white mt-0.5">{m.accountNumber}</p>
                    <p className="text-xs text-gray-500">a.n. {m.accountName}</p>
                  </div>
                ))}
              </div>
            )}

            {qrisMethods.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5"><IconQrcode className="w-3.5 h-3.5" /> QRIS</p>
                <div className="flex flex-wrap gap-4">
                  {qrisMethods.map((m) => (
                    <div key={m.id} className="text-center">
                      {m.qrisImage && (
                        <img src={m.qrisImage} alt={m.label} className="w-32 h-32 object-contain border border-gray-200 dark:border-gray-800 rounded-xl bg-white" />
                      )}
                      <p className="text-[10px] text-gray-500 mt-1">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-gray-400">Setelah transfer, upload bukti pembayaran di tagihan yang bersangkutan.</p>
          </div>
        )}

        {/* Daftar Tagihan */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Riwayat Tagihan</h2>
          </div>

          {transactions.length === 0 ? (
            <div className="py-12 text-center">
              <IconReceipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Belum ada tagihan.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-900">
              {transactions.map((tx) => {
                const canUpload = tx.status === "PENDING" || tx.status === "AWAITING_VERIFICATION";
                return (
                  <div key={tx.id} className="p-5 flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{tx.invoiceNumber}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[tx.status] ?? STATUS_BADGE.PENDING}`}>
                          {STATUS_LABEL[tx.status] ?? tx.status}
                        </span>
                      </div>
                      <p className="text-xl font-black text-gray-900 dark:text-white">Rp {tx.amount.toLocaleString("id-ID")}</p>
                      <p className="text-xs text-gray-500">
                        {tx.periodMonths ?? 1} bulan · {tx.paymentMethod?.replace("_", " ") ?? "—"} · Dibuat {fmt(tx.createdAt)}
                      </p>
                      {tx.dueDate && (
                        <p className="text-[10px] text-gray-400">Jatuh tempo: {fmt(tx.dueDate)}</p>
                      )}
                      {tx.paidAt && (
                        <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold">Dibayar: {fmt(tx.paidAt)}</p>
                      )}
                      {tx.paymentProof && (
                        <a href={tx.paymentProof} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-600 hover:underline">
                          Lihat bukti bayar →
                        </a>
                      )}
                    </div>
                    {canUpload && (
                      <button
                        onClick={() => openUpload(tx.id)}
                        disabled={uploading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
                      >
                        <IconUpload className="w-3.5 h-3.5" />
                        Upload Bukti
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <MediaLibrary
        isOpen={isLibraryOpen}
        onClose={() => { setLibraryOpen(false); setUploadTarget(null); }}
        tenantId={tenantId}
        onSelect={(url) => uploadTarget && handleUploadProof(uploadTarget, url)}
      />
    </>
  );
}
