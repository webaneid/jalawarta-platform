# Arsitektur QRIS Dynamic Nominal — Jala Warta Platform

> **Dokumen ini adalah sumber kebenaran implementasi QRIS untuk Jala Warta SaaS.**  
> Ditulis ulang dari proposal awal untuk menyesuaikan stack aktual:  
> Next.js 15 App Router · Drizzle ORM · PostgreSQL · Server Actions · tanpa payment gateway.

---

## 1. Konsep Inti

QRIS statis memiliki EMV payload berformat TLV (Tag-Length-Value). Dengan memanipulasi payload ini di runtime, sistem dapat **mengunci nominal** langsung di dalam QR code — tanpa payment gateway berbayar.

```
QRIS Statis (dari GoPay/GoBiz merchant platform)
         ↓  Simpan EMV payload string di DB
         ↓
Saat tenant buka tagihan QRIS:
  1. Load EMV payload dari platform_payment_methods.emvPayload
  2. Ubah Tag 01: "11" (static) → "12" (dynamic)
  3. Inject Tag 54 = transactions.amount (Rupiah, integer)
  4. Hitung ulang CRC16-CCITT
  5. Generate QR image (SVG/PNG) dari payload baru
         ↓
Tenant scan QR → nominal terkunci otomatis di aplikasi pembayaran
         ↓
Tenant upload bukti bayar → Admin verifikasi → transaksi PAID
```

**Tidak ada webhook, tidak ada callback otomatis.** Konfirmasi tetap manual — admin verifikasi di `/platform/transactions/[id]`.

---

## 2. Konteks dalam Jala Warta

QRIS ini digunakan untuk **satu skenario**:

```
ARAH: Tenant → Platform (bayar subscription)
Pemegang QRIS: Platform Admin (dari akun GoPay/GoBiz platform)
Pembayar: Tenant (scan QR saat buka halaman billing)
Alur bukti: Tenant upload di /settings/billing → Admin approve di /platform/transactions/[id]
```

> **Bukan** QRIS untuk reader → tenant (donasi konten). Itu disimpan di `schemaConfig.tenantQrisImage` sebagai gambar statis — tidak ada EMV dynamic.

---

## 3. Perbedaan dengan Dokumen Awal

| Dokumen Lama | Jala Warta Aktual |
|---|---|
| Stack: Elysia API terpisah + Prisma | Stack: Next.js 15 App Router + Drizzle ORM |
| Tabel `Setting` (key-value) | Kolom `emvPayload` di `platform_payment_methods` |
| Model `Invoice` dengan `balanceDue` | Tabel `transactions` dengan `amount` |
| `proofOfPayment` di model Payment | `transactions.paymentProof` (sudah ada) |
| Endpoint REST `/api/v1/invoices/.../qris` | Next.js Route Handler: `GET /api/qris/[txId]` |
| `pendingProofUrl` di Invoice | `transactions.paymentProof` (sudah ada) |
| Settings.tsx halaman terpisah | `/platform/payment-methods` — tambah field EMV |
| InvoicePublic.tsx | `/settings/billing/BillingClient.tsx` |
| Admin di Invoices.tsx | `/platform/transactions/[id]` (sudah ada) |
| iPaymu gateway | Tidak relevan |
| WA notification | Out of scope fase ini |

---

## 4. Skema Database

### 4.1 Kolom Baru di `platform_payment_methods`

Tabel ini sudah ada (dibuat di F1). Perlu tambah satu kolom:

```typescript
// src/db/schema.ts — platform_payment_methods
emvPayload: text("emv_payload"),
// EMV payload string dari QRIS statis GoPay/GoBiz
// Contoh: "000201010211..."
// NULL = tidak ada payload, gunakan gambar statis saja
```

**Tidak ada tabel baru.** Semua data sudah tersedia:
- `transactions.amount` → nominal yang akan di-inject
- `transactions.paymentMethodId` → FK ke `platform_payment_methods.id`
- `transactions.paymentProof` → URL bukti bayar dari tenant (sudah ada)
- `transactions.status` → flow: PENDING → AWAITING_VERIFICATION → PAID

### 4.2 Field Lain yang Sudah Ada (Tidak Berubah)

```typescript
// Sudah ada di platform_payment_methods:
qrisImage: text("qris_image")    // URL gambar QRIS statis (fallback display)
qrisProvider: text("qris_provider") // "GoPay", "DANA", dll

// Sudah ada di transactions:
paymentProof: text("payment_proof")  // URL screenshot bukti bayar dari tenant
status: text("status")               // PENDING | AWAITING_VERIFICATION | PAID | EXPIRED | CANCELLED
```

---

## 5. QRIS Generator Library

**File:** `src/lib/qris/generator.ts`

Pure TypeScript — tidak bergantung pada Node.js API tertentu, bisa dijalankan di Edge/Server Components.

```typescript
// Fungsi yang diekspos:
export function parseTlv(payload: string): Map<string, string>
// Parse EMV string → Map{ tag → value }

export function injectAmount(payload: string, amount: number): string
// Orchestrator:
// 1. Parse TLV
// 2. Ubah tag "01" → "12" (static → dynamic)
// 3. Hapus tag "54" lama (jika ada) + tag "63" (CRC lama)
// 4. Rebuild string
// 5. Append tag 54 + amount
// 6. Append "6304" + CRC16-CCITT

export function calculateCrc16(data: string): string
// CRC16-CCITT: poly 0x1021, init 0xFFFF, no reflection
// Input: seluruh payload string TERMASUK "6304" tapi TANPA nilai CRC
// Output: 4-char hex uppercase

export function parseMerchantInfo(payload: string): { name: string; city: string }
// Parse Tag 59 (merchant name) dan Tag 60 (merchant city)

export async function generateQrDataUrl(payload: string): Promise<string>
// Gunakan library `qrcode` (bun add qrcode @types/qrcode)
// Return: "data:image/png;base64,..."
```

**Algoritma inject amount (detail):**
```
1. parseTlv(payload) → entries[]
2. Mutasi entry tag="01": value = "12"
3. Filter out tag="54" dan tag="63"
4. Rebuild: setiap entry → tag + pad(value.length, 2) + value
5. Append: "54" + pad(amount.toString().length, 2) + amount.toString()
6. Append: "6304"
7. CRC = calculateCrc16(string_sampai_sini)
8. Append: CRC (4 char)
9. Return final string
```

**CRC16-CCITT:**
```
Polynomial : 0x1021
Init value : 0xFFFF
Reflection : None (tidak ada input/output reflection)
Input      : UTF-8 bytes dari seluruh payload string (termasuk "6304")
Output     : 4 char hex uppercase
```

---

## 6. Route Handler — Generate QR per Transaksi

**File:** `src/app/api/qris/[txId]/route.ts`

Public endpoint (tidak butuh auth — tenant hanya tahu ID transaksinya sendiri).

```typescript
// GET /api/qris/[txId]
export async function GET(req: Request, { params }: { params: Promise<{ txId: string }> }) {
  const { txId } = await params;

  // 1. Load transaksi + payment method
  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, txId),
    with: { paymentMethodRef: true },
  });

  // Guard: transaksi harus ada, belum PAID, payment method harus QRIS + punya emvPayload
  if (!tx || tx.status === "PAID" || tx.status === "CANCELLED") {
    return Response.json({ error: "Transaksi tidak valid." }, { status: 400 });
  }
  if (!tx.paymentMethodRef?.emvPayload) {
    return Response.json({ error: "QRIS payload belum dikonfigurasi." }, { status: 400 });
  }

  // 2. Generate QR
  const dynamicPayload = injectAmount(tx.paymentMethodRef.emvPayload, tx.amount);
  const qrDataUrl = await generateQrDataUrl(dynamicPayload);
  const merchantInfo = parseMerchantInfo(tx.paymentMethodRef.emvPayload);

  return Response.json({
    qrDataUrl,         // "data:image/png;base64,..."
    amount: tx.amount,
    merchantName: merchantInfo.name,
    merchantCity: merchantInfo.city,
    invoiceNumber: tx.invoiceNumber,
    expiresMinutes: 15,  // kosmetik — tidak ada countdown real
  });
}
```

---

## 7. UI — Platform Admin (`/platform/payment-methods`)

Halaman ini sudah ada (F4). Perlu ditambah:

**Saat tambah/edit QRIS** — tambah field di modal:

```
[ ] EMV Payload
    Textarea — paste string payload dari QRIS statis GoPay/GoBiz
    Helper: "Decode dari gambar" (opsional, fase lanjut via jsQR di browser)

[ ] Preview QR Test
    Tombol: "Generate QR Rp 10.000" → fetch /api/qris/preview → tampilkan QR
    (endpoint preview terpisah, tidak butuh txId — pakai payload langsung)
```

**Info yang auto-parse dari payload** (readonly, tampil setelah paste):
```
Merchant Name : [auto dari Tag 59]
Merchant City : [auto dari Tag 60]
```

**Validasi:**
- EMV payload tidak wajib — jika kosong, sistem tampilkan gambar statis (`qrisImage`)
- Jika ada payload → sistem otomatis gunakan dynamic QR

---

## 8. UI — Tenant Billing (`/settings/billing`)

Halaman ini sudah ada (F5). Perlu ditambah section QRIS dinamis:

**Saat transaksi `status: "PENDING"` dengan `paymentMethod: "qris"`:**

```
State machine komponen QR:
  'idle'      → tombol "Tampilkan QR Pembayaran"
  'loading'   → spinner (fetch /api/qris/[txId])
  'qr'        → tampilkan QR image + nominal + merchant + countdown 15 menit
              → tombol "Sudah Bayar →"
  'proof'     → form upload bukti (via MediaLibrary picker)
  'submitted' → "Bukti terkirim. Admin akan verifikasi dalam 1×24 jam."

Tampilan QR:
  [ QR image — dinamis, nominal terkunci ]
  Rp XXX.XXX (bold)
  Merchant: {merchantName} · {merchantCity}
  Bisa dibayar via: GoPay, OVO, DANA, m-Banking apapun
  ⏱ Berlaku 15 menit
  [ Sudah Bayar → ]
```

**Fallback** — jika `emvPayload` tidak ada tapi `qrisImage` ada:
- Tampilkan gambar QRIS statis
- Nominal TIDAK terkunci (tenant input manual nominal saat scan)
- Tetap ada tombol "Sudah Bayar" → upload bukti

---

## 9. Rute & File yang Dibutuhkan

| File | Tipe | Status |
|---|---|---|
| `src/db/schema.ts` | Edit — tambah `emvPayload` ke `platformPaymentMethods` | 🔴 Q1 |
| `src/lib/qris/generator.ts` | Baru — TLV parser, amount injector, CRC16, QR gen | 🔴 Q2 |
| `src/app/api/qris/[txId]/route.ts` | Baru — Next.js Route Handler, public | 🔴 Q3 |
| `src/components/platform/PaymentMethodsClient.tsx` | Edit — tambah field EMV payload + preview | 🟠 Q4 |
| `src/app/actions/platform.ts` | Edit — `addPlatformPaymentMethod` & `updatePlatformPaymentMethod` terima `emvPayload` | 🟠 Q4 |
| `src/app/app/settings/billing/BillingClient.tsx` | Edit — state machine QR + fetch `/api/qris/[txId]` | 🟠 Q5 |

### Dependency Baru
```bash
bun add qrcode && bun add -d @types/qrcode
```

---

## 10. Urutan Eksekusi (Phases)

| | Phase | Scope | Effort |
|---|---|---|---|
| 🔴 | **Q1 — DB Migration** | Tambah kolom `emvPayload` ke `platform_payment_methods` + drizzle push | XS |
| 🔴 | **Q2 — QRIS Generator** | `src/lib/qris/generator.ts` — pure TS, TLV + CRC + QR gen | S |
| 🔴 | **Q3 — Route Handler** | `GET /api/qris/[txId]` — validasi + generate + return JSON | S |
| 🟠 | **Q4 — Platform UI** | Form QRIS di `/platform/payment-methods` — tambah EMV payload field + preview | M |
| 🟠 | **Q5 — Billing UI** | `/settings/billing` — state machine QR dinamis per transaksi | M |

**Q1–Q3 harus selesai sebelum Q4–Q5** (dependency).

---

## 11. Yang Perlu Disiapkan Platform Admin

1. Login ke **GoPay/GoBiz** → buka menu QRIS Merchant → unduh/screenshot gambar QRIS
2. Decode gambar QRIS → extract EMV payload string
   - Cara mudah: gunakan tool online seperti [emvco.com/tools](https://www.emvco.com/) atau scan dengan kamera HP → copy teks yang muncul
   - Nanti ada tombol "Decode dari Gambar" di `/platform/payment-methods` (fase lanjut via jsQR)
3. Buka `/platform/payment-methods` → edit metode QRIS yang sudah ada → paste payload di field "EMV Payload"
4. Klik "Preview QR" → test scan dari HP → pastikan nominal Rp 10.000 terkunci
5. Selesai — sistem otomatis generate QR dinamis per tagihan tenant

---

## 12. Keamanan

- **EMV payload tidak pernah dikirim ke client** — hanya QR image (data URL) yang dikembalikan
- Route Handler `/api/qris/[txId]` hanya generate QR jika transaksi `status !== "PAID"` dan `status !== "CANCELLED"`
- Upload bukti bayar: validasi tipe file (jpg/png/webp) di MediaLibrary yang sudah ada
- Tidak ada nominal injection dari client — semua diambil dari `transactions.amount` di server

---

## 13. Checklist Implementasi

- [x] Q1: Tambah kolom `emvPayload` ke schema + drizzle push
- [x] Q2: Buat `src/lib/qris/generator.ts` (parseTlv, injectAmount, CRC16, generateQrDataUrl)
- [x] Q3: Buat `src/app/api/qris/[txId]/route.ts`
- [x] Q4: Update `PaymentMethodsClient` + `addPlatformPaymentMethod` action
- [x] Q5: Update `BillingClient` — state machine QR per transaksi
- [ ] End-to-end: scan QR → nominal terkunci → upload bukti → admin approve → PAID
