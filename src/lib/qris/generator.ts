/**
 * QRIS Dynamic Nominal Generator
 *
 * Memanipulasi EMV TLV payload QRIS statis untuk inject nominal per-transaksi.
 * Tanpa payment gateway — konfirmasi tetap manual (upload bukti + admin approve).
 *
 * Spec:
 *   - EMV QRIS spec (EMVCo)
 *   - CRC16-CCITT: poly 0x1021, init 0xFFFF, no reflection
 */

// ── TLV Parser ────────────────────────────────────────────────

type TlvEntry = { tag: string; value: string };

/**
 * Parse EMV TLV string → array entries berurutan.
 * Format tiap entry: 2-char tag + 2-char length (desimal) + value.
 */
export function parseTlv(payload: string): TlvEntry[] {
  const entries: TlvEntry[] = [];
  let i = 0;
  while (i < payload.length) {
    const tag = payload.slice(i, i + 2);
    const len = parseInt(payload.slice(i + 2, i + 4), 10);
    const value = payload.slice(i + 4, i + 4 + len);
    entries.push({ tag, value });
    i += 4 + len;
  }
  return entries;
}

/**
 * Rebuild TLV entries → EMV string.
 */
function buildTlv(entries: TlvEntry[]): string {
  return entries
    .map(({ tag, value }) => `${tag}${String(value.length).padStart(2, "0")}${value}`)
    .join("");
}

// ── CRC16-CCITT ───────────────────────────────────────────────

/**
 * Hitung CRC16-CCITT atas string UTF-8.
 * Polynomial: 0x1021 | Init: 0xFFFF | No reflection.
 * Input harus sudah include "6304" tapi TANPA nilai CRC 4 char di akhir.
 */
export function calculateCrc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// ── Amount Injector ───────────────────────────────────────────

/**
 * Inject nominal ke dalam EMV payload QRIS statis.
 *
 * Algoritma:
 * 1. Parse TLV
 * 2. Ubah tag "01" (mode) dari "11" (static) → "12" (dynamic) — wajib agar nominal terkunci
 * 3. Hapus tag "54" (amount) dan tag "63" (CRC) lama
 * 4. Rebuild string
 * 5. Append tag 54 + amount (integer IDR, tanpa desimal)
 * 6. Append "6304" + CRC16-CCITT baru
 */
export function injectAmount(emvPayload: string, amount: number): string {
  const entries = parseTlv(emvPayload);

  // Ubah mode static → dynamic
  const mutated = entries
    .map((e) => (e.tag === "01" ? { tag: "01", value: "12" } : e))
    // Hapus tag amount lama dan CRC lama
    .filter((e) => e.tag !== "54" && e.tag !== "63");

  // Rebuild tanpa amount & CRC
  let base = buildTlv(mutated);

  // Inject nominal
  const amountStr = amount.toString();
  base += `54${String(amountStr.length).padStart(2, "0")}${amountStr}`;

  // Tambah CRC header → hitung → append
  base += "6304";
  const crc = calculateCrc16(base);
  return base + crc;
}

// ── Merchant Info Parser ──────────────────────────────────────

/**
 * Parse merchant name (Tag 59) dan merchant city (Tag 60) dari payload.
 */
export function parseMerchantInfo(emvPayload: string): { name: string; city: string } {
  const entries = parseTlv(emvPayload);
  const name = entries.find((e) => e.tag === "59")?.value ?? "";
  const city = entries.find((e) => e.tag === "60")?.value ?? "";
  return { name, city };
}

// ── QR Image Generator ────────────────────────────────────────

/**
 * Generate QR code dari EMV payload → data URL PNG.
 * Gunakan library `qrcode`.
 */
export async function generateQrDataUrl(payload: string): Promise<string> {
  const QRCode = await import("qrcode");
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

// ── Validator ─────────────────────────────────────────────────

/**
 * Validasi apakah string adalah EMV QRIS payload yang valid.
 * Cek minimal: dimulai dengan tag "00" (payload format indicator) dan ada tag "63" (CRC).
 */
export function isValidEmvPayload(payload: string): boolean {
  if (!payload || payload.length < 20) return false;
  try {
    const entries = parseTlv(payload);
    const has00 = entries.some((e) => e.tag === "00");
    const has63 = entries.some((e) => e.tag === "63");
    return has00 && has63;
  } catch {
    return false;
  }
}
