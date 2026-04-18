import { db } from "@/db";
import { transactions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { injectAmount, generateQrDataUrl, parseMerchantInfo } from "@/lib/qris/generator";

/**
 * GET /api/qris/[txId]
 *
 * Public endpoint — tidak butuh auth.
 * Generate QR dinamis dengan nominal terkunci sesuai transactions.amount.
 *
 * Guard:
 * - Transaksi harus ada
 * - Status bukan PAID / CANCELLED
 * - paymentMethodRef harus type "qris" dan punya emvPayload
 *
 * Fallback: jika emvPayload kosong tapi qrisImage ada → return { fallbackImage }
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ txId: string }> }
) {
  const { txId } = await params;

  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, txId),
    with: { paymentMethodRef: true },
  });

  if (!tx) {
    return Response.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
  }

  if (tx.status === "PAID" || tx.status === "CANCELLED") {
    return Response.json({ error: "Transaksi sudah selesai." }, { status: 400 });
  }

  const method = tx.paymentMethodRef;

  // Fallback: ada gambar statis tapi tidak ada EMV payload
  if (!method?.emvPayload) {
    if (method?.qrisImage) {
      return Response.json({
        fallback: true,
        qrisImage: method.qrisImage,
        amount: tx.amount,
        invoiceNumber: tx.invoiceNumber,
        merchantName: method.label ?? "",
        merchantCity: "",
      });
    }
    return Response.json(
      { error: "QRIS belum dikonfigurasi. Hubungi admin platform." },
      { status: 400 }
    );
  }

  try {
    const dynamicPayload = injectAmount(method.emvPayload, tx.amount);
    const qrDataUrl = await generateQrDataUrl(dynamicPayload);
    const { name, city } = parseMerchantInfo(method.emvPayload);

    return Response.json({
      fallback: false,
      qrDataUrl,
      amount: tx.amount,
      invoiceNumber: tx.invoiceNumber,
      merchantName: name || method.label,
      merchantCity: city,
      provider: method.qrisProvider ?? "",
      expiresMinutes: 15,
    });
  } catch (err: any) {
    return Response.json(
      { error: "Gagal generate QR: " + err.message },
      { status: 500 }
    );
  }
}
