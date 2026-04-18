"use client";

import { useState, useCallback } from "react";
import { uploadPaymentProof } from "@/app/actions/settings";
import MediaLibrary from "@/components/MediaLibrary";
import { useRouter } from "next/navigation";
import {
  IconReceipt, IconBuildingBank, IconQrcode, IconUpload,
  IconLoader2, IconRefresh,
} from "@tabler/icons-react";

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

type QrState = "idle" | "loading" | "qr" | "qr_fallback" | "proof" | "submitted";

type QrData = {
  fallback: boolean;
  qrDataUrl?: string;
  qrisImage?: string;
  amount: number;
  invoiceNumber: string;
  merchantName: string;
  merchantCity?: string;
  provider?: string;
  expiresMinutes?: number;
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

// ── QR Block — per transaksi ──────────────────────────────────
function QrBlock({ tx, tenantId, onProofUploaded }: {
  tx: Tx;
  tenantId: string;
  onProofUploaded: () => void;
}) {
  const [qrState, setQrState] = useState<QrState>("idle");
  const [qrData, setQrData] = useState<QrData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLibraryOpen, setLibraryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const canInteract = tx.status === "PENDING" || tx.status === "AWAITING_VERIFICATION";

  async function fetchQr() {
    setQrState("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/qris/${tx.id}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Gagal memuat QR.");
        setQrState("idle");
        return;
      }
      setQrData(data);
      setQrState(data.fallback ? "qr_fallback" : "qr");
    } catch {
      setErrorMsg("Gagal terhubung ke server.");
      setQrState("idle");
    }
  }

  async function handleUpload(url: string) {
    setUploading(true);
    const res = await uploadPaymentProof(tx.id, url);
    if (res.success) {
      setQrState("submitted");
      onProofUploaded();
    } else {
      setErrorMsg(res.error || "Gagal upload bukti.");
    }
    setUploading(false);
    setLibraryOpen(false);
  }

  // Sudah ada bukti sebelumnya (AWAITING_VERIFICATION)
  if (tx.status === "AWAITING_VERIFICATION" && tx.paymentProof && qrState === "idle") {
    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
          ⏳ Bukti pembayaran sudah dikirim, menunggu verifikasi admin.
        </p>
        <a href={tx.paymentProof} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-600 hover:underline">
          Lihat bukti yang dikirim →
        </a>
        <button
          onClick={() => setLibraryOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          <IconUpload className="w-3.5 h-3.5" /> Kirim Ulang Bukti
        </button>
        <MediaLibrary isOpen={isLibraryOpen} onClose={() => setLibraryOpen(false)} tenantId={tenantId} onSelect={handleUpload} />
      </div>
    );
  }

  if (!canInteract) return null;

  return (
    <>
      {/* State: idle */}
      {qrState === "idle" && (
        <div className="mt-3">
          {errorMsg && <p className="text-xs text-red-500 mb-2">{errorMsg}</p>}
          <button
            onClick={fetchQr}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            <IconQrcode className="w-4 h-4" /> Tampilkan QR Pembayaran
          </button>
        </div>
      )}

      {/* State: loading */}
      {qrState === "loading" && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <IconLoader2 className="w-4 h-4 animate-spin" /> Generating QR...
        </div>
      )}

      {/* State: qr — dynamic (nominal terkunci) */}
      {qrState === "qr" && qrData && (
        <div className="mt-3 bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 space-y-4">
          <div className="flex gap-5 items-start">
            <div className="flex-shrink-0">
              <img
                src={qrData.qrDataUrl}
                alt="QR Pembayaran"
                className="w-44 h-44 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white"
              />
              <p className="text-[9px] text-center text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                ✓ Nominal Terkunci Otomatis
              </p>
            </div>
            <div className="space-y-2 min-w-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Total Pembayaran</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                Rp {qrData.amount.toLocaleString("id-ID")}
              </p>
              {qrData.merchantName && (
                <p className="text-xs text-gray-500">
                  Merchant: <span className="font-semibold text-gray-700 dark:text-gray-300">{qrData.merchantName}</span>
                  {qrData.merchantCity ? ` · ${qrData.merchantCity}` : ""}
                </p>
              )}
              {qrData.provider && (
                <p className="text-xs text-gray-400">{qrData.provider}</p>
              )}
              <p className="text-[10px] text-gray-400">
                Bisa dibayar via: GoPay, OVO, DANA, m-Banking, dan QRIS apapun.
              </p>
              {qrData.expiresMinutes && (
                <p className="text-[10px] text-amber-500">⏱ QR berlaku ±{qrData.expiresMinutes} menit</p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setLibraryOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  <IconUpload className="w-3.5 h-3.5" /> Sudah Bayar →
                </button>
                <button
                  onClick={() => { setQrState("idle"); setQrData(null); }}
                  className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
                  title="Tutup"
                >
                  <IconRefresh className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-3">
            Setelah transfer, klik "Sudah Bayar" dan upload screenshot bukti pembayaran Anda.
          </p>
        </div>
      )}

      {/* State: qr_fallback — gambar statis (nominal tidak terkunci) */}
      {qrState === "qr_fallback" && qrData && (
        <div className="mt-3 bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 space-y-3">
          <div className="flex gap-5 items-start">
            {qrData.qrisImage && (
              <img
                src={qrData.qrisImage}
                alt="QRIS Statis"
                className="w-40 h-40 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white object-contain flex-shrink-0"
              />
            )}
            <div className="space-y-2">
              <p className="text-[10px] text-amber-500 font-semibold">
                ⚠ Masukkan nominal secara manual saat scan: <span className="font-black">Rp {qrData.amount.toLocaleString("id-ID")}</span>
              </p>
              {qrData.merchantName && (
                <p className="text-xs text-gray-500">Merchant: {qrData.merchantName}</p>
              )}
              <button
                onClick={() => setLibraryOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                <IconUpload className="w-3.5 h-3.5" /> Sudah Bayar →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State: submitted */}
      {qrState === "submitted" && (
        <div className="mt-3 bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-3">
          <p className="text-sm text-green-700 dark:text-green-400 font-semibold">
            ✅ Bukti pembayaran berhasil dikirim.
          </p>
          <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">Admin akan memverifikasi dalam 1×24 jam.</p>
        </div>
      )}

      <MediaLibrary
        isOpen={isLibraryOpen}
        onClose={() => setLibraryOpen(false)}
        tenantId={tenantId}
        onSelect={handleUpload}
      />
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────
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
  const [globalMsg, setGlobalMsg] = useState<string | null>(null);

  const handleProofUploaded = useCallback(() => {
    setGlobalMsg("✅ Bukti pembayaran dikirim. Admin akan memverifikasi dalam 1×24 jam.");
    router.refresh();
    setTimeout(() => setGlobalMsg(null), 6000);
  }, [router]);

  const fmt = (d: Date | null) =>
    d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";

  const bankMethods = paymentMethods.filter((m) => m.type === "bank_transfer");
  const qrisMethods = paymentMethods.filter((m) => m.type === "qris");

  return (
    <div className="space-y-6">
      {globalMsg && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
          {globalMsg}
        </div>
      )}

      {/* Info cara pembayaran platform */}
      {paymentMethods.length > 0 && (
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cara Pembayaran Subscription</h2>

          {bankMethods.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                <IconBuildingBank className="w-3.5 h-3.5" /> Transfer Bank
              </p>
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
            <div className="space-y-1">
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                <IconQrcode className="w-3.5 h-3.5" /> QRIS
              </p>
              <p className="text-[10px] text-gray-400">QR dinamis dengan nominal terkunci tersedia langsung di setiap tagihan di bawah.</p>
            </div>
          )}

          <p className="text-[10px] text-gray-400">Setelah transfer, klik "Sudah Bayar" di tagihan yang bersangkutan dan upload bukti.</p>
        </div>
      )}

      {/* Daftar tagihan */}
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
            {transactions.map((tx) => (
              <div key={tx.id} className="p-5">
                {/* Header tagihan */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">{tx.invoiceNumber}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[tx.status] ?? STATUS_BADGE.PENDING}`}>
                        {STATUS_LABEL[tx.status] ?? tx.status}
                      </span>
                    </div>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">
                      Rp {tx.amount.toLocaleString("id-ID")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {tx.periodMonths ?? 1} bulan · {tx.paymentMethod?.replace(/_/g, " ") ?? "—"} · Dibuat {fmt(tx.createdAt)}
                    </p>
                    {tx.dueDate && (
                      <p className="text-[10px] text-gray-400">Jatuh tempo: {fmt(tx.dueDate)}</p>
                    )}
                    {tx.paidAt && (
                      <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold">Dibayar: {fmt(tx.paidAt)}</p>
                    )}
                  </div>
                </div>

                {/* QR Block — hanya untuk transaksi QRIS yang belum PAID */}
                {tx.paymentMethod === "qris" && tx.status !== "PAID" && tx.status !== "CANCELLED" && tx.status !== "EXPIRED" && (
                  <QrBlock tx={tx} tenantId={tenantId} onProofUploaded={handleProofUploaded} />
                )}

                {/* Upload biasa untuk non-QRIS */}
                {tx.paymentMethod !== "qris" && (tx.status === "PENDING" || tx.status === "AWAITING_VERIFICATION") && (
                  <UploadBlock tx={tx} tenantId={tenantId} onUploaded={handleProofUploaded} />
                )}

                {/* Bukti sudah ada + sudah PAID */}
                {tx.status === "PAID" && tx.paymentProof && (
                  <a href={tx.paymentProof} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[10px] text-purple-600 hover:underline">
                    Lihat bukti bayar →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Upload Block — untuk non-QRIS ─────────────────────────────
function UploadBlock({ tx, tenantId, onUploaded }: {
  tx: Tx;
  tenantId: string;
  onUploaded: () => void;
}) {
  const [isLibraryOpen, setLibraryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleUpload(url: string) {
    setUploading(true);
    const res = await uploadPaymentProof(tx.id, url);
    if (res.success) {
      setDone(true);
      onUploaded();
    }
    setUploading(false);
    setLibraryOpen(false);
  }

  if (done) return (
    <p className="mt-3 text-xs text-green-600 dark:text-green-400 font-semibold">✅ Bukti terkirim, menunggu verifikasi.</p>
  );

  if (tx.status === "AWAITING_VERIFICATION" && tx.paymentProof) return (
    <div className="mt-3 space-y-1">
      <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">⏳ Menunggu verifikasi admin.</p>
      <a href={tx.paymentProof} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-600 hover:underline">
        Lihat bukti yang dikirim →
      </a>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setLibraryOpen(true)}
        disabled={uploading}
        className="mt-3 flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors"
      >
        <IconUpload className="w-3.5 h-3.5" /> Upload Bukti Bayar
      </button>
      <MediaLibrary isOpen={isLibraryOpen} onClose={() => setLibraryOpen(false)} tenantId={tenantId} onSelect={handleUpload} />
    </>
  );
}
