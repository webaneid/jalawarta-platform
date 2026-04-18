"use client";

import { useState, useTransition } from "react";
import { updateTenantSettings } from "@/app/actions/settings";
import MediaLibrary from "@/components/MediaLibrary";
import { useRouter } from "next/navigation";
import {
  IconBuildingStore,
  IconPhone,
  IconBrandInstagram,
  IconCreditCard,
  IconSettings2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";

const TABS = [
  { id: "identitas", label: "Identitas", icon: IconBuildingStore },
  { id: "kontak", label: "Kontak", icon: IconPhone },
  { id: "sosial", label: "Sosial Media", icon: IconBrandInstagram },
  { id: "pembayaran", label: "Pembayaran", icon: IconCreditCard },
  { id: "teknis", label: "Teknis", icon: IconSettings2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

type BankAccount = {
  bankName: string;
  accountNumber: string;
  accountName: string;
  label?: string;
};

export default function ClientSettings({ tenant }: { tenant: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabId>("identitas");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [mediaTarget, setMediaTarget] = useState<"favicon" | "logo" | "qris" | null>(null);

  const cfg = tenant.schemaConfig || {};

  // ── State per tab ─────────────────────────────────────────────
  // Tab 1 — Identitas
  const [siteName, setSiteName] = useState(tenant.siteName || "");
  const [slogan, setSlogan] = useState(cfg.tagline || cfg.slogan || "");
  const [description, setDescription] = useState(cfg.description || "");
  const [logo, setLogo] = useState(cfg.logo || "");
  const [favicon, setFavicon] = useState(cfg.favicon || "");
  const [themeColor, setThemeColor] = useState(cfg.themeColor || "#2563EB");

  // Tab 2 — Kontak
  const [contactEmail, setContactEmail] = useState(cfg.contactEmail || "");
  const [contactPhone, setContactPhone] = useState(cfg.contactPhone || "");
  const [address, setAddress] = useState(cfg.address || "");
  const [city, setCity] = useState(cfg.city || "");
  const [province, setProvince] = useState(cfg.province || "");
  const [postalCode, setPostalCode] = useState(cfg.postalCode || "");

  // Tab 3 — Sosial Media
  const [socialInstagram, setSocialInstagram] = useState(cfg.socialInstagram || "");
  const [socialX, setSocialX] = useState(cfg.socialX || "");
  const [socialFacebook, setSocialFacebook] = useState(cfg.socialFacebook || "");
  const [socialYoutube, setSocialYoutube] = useState(cfg.socialYoutube || "");
  const [socialTiktok, setSocialTiktok] = useState(cfg.socialTiktok || "");
  const [socialLinkedin, setSocialLinkedin] = useState(cfg.socialLinkedin || "");

  // Tab 4 — Pembayaran
  const [businessName, setBusinessName] = useState(cfg.businessName || "");
  const [npwp, setNpwp] = useState(cfg.npwp || "");
  const [tenantBankAccounts, setTenantBankAccounts] = useState<BankAccount[]>(
    cfg.tenantBankAccounts || []
  );
  const [tenantQrisImage, setTenantQrisImage] = useState(cfg.tenantQrisImage || "");

  // Tab 5 — Teknis
  const [customDomain, setCustomDomain] = useState(tenant.customDomain || "");
  const [timezone, setTimezone] = useState(cfg.timezone || "Asia/Jakarta");
  const [language, setLanguage] = useState(cfg.language || "id_ID");
  const [seoIndexing, setSeoIndexing] = useState(cfg.searchVisible !== undefined ? cfg.searchVisible : true);
  const [maintenanceMode, setMaintenanceMode] = useState(cfg.maintenanceMode || false);
  const [footerText, setFooterText] = useState(cfg.footerText || `© ${new Date().getFullYear()} ${tenant.siteName || "Jalawarta"}. Hak cipta dilindungi.`);

  // ── Save ──────────────────────────────────────────────────────
  function handleSave() {
    startTransition(async () => {
      const mergedConfig = {
        ...cfg,
        // identitas
        tagline: slogan,
        slogan,
        description,
        logo,
        favicon,
        themeColor,
        // kontak
        contactEmail,
        contactPhone,
        address,
        city,
        province,
        postalCode,
        // sosial
        socialInstagram,
        socialX,
        socialFacebook,
        socialYoutube,
        socialTiktok,
        socialLinkedin,
        // pembayaran
        businessName,
        npwp,
        tenantBankAccounts,
        tenantQrisImage,
        // teknis
        timezone,
        language,
        searchVisible: seoIndexing,
        maintenanceMode,
        footerText,
      };

      const result = await updateTenantSettings(tenant.id, {
        siteName,
        customDomain,
        schemaConfig: mergedConfig,
      });

      if (result.success) {
        setStatusMsg("✅ Pengaturan berhasil disimpan.");
        router.refresh();
        setTimeout(() => setStatusMsg(null), 3000);
      } else {
        setStatusMsg("❌ Gagal menyimpan: " + result.error);
      }
    });
  }

  // ── Bank accounts helpers ─────────────────────────────────────
  function addBankAccount() {
    setTenantBankAccounts((prev) => [
      ...prev,
      { bankName: "", accountNumber: "", accountName: "", label: "" },
    ]);
  }
  function removeBankAccount(idx: number) {
    setTenantBankAccounts((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateBankAccount(idx: number, field: keyof BankAccount, value: string) {
    setTenantBankAccounts((prev) =>
      prev.map((acc, i) => (i === idx ? { ...acc, [field]: value } : acc))
    );
  }

  // ── Media pick handler ────────────────────────────────────────
  function onMediaSelect(url: string) {
    if (mediaTarget === "favicon") setFavicon(url);
    if (mediaTarget === "logo") setLogo(url);
    if (mediaTarget === "qris") setTenantQrisImage(url);
    setMediaTarget(null);
  }

  // ── Input class ───────────────────────────────────────────────
  const inputCls =
    "w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500";

  return (
    <>
      <div className="space-y-6">
        {/* Tab nav */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  active
                    ? "border-purple-600 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 space-y-6">

            {/* ── Tab 1: Identitas ───────────────────────────── */}
            {activeTab === "identitas" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nama Situs</label>
                    <input className={inputCls} value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Beritaku Independen" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Slogan / Tagline</label>
                    <input className={inputCls} value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Berita terpercaya setiap hari" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Deskripsi / Tentang Situs</label>
                  <textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jelaskan tentang portal berita Anda..." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Logo Situs</label>
                    <div className="flex items-center gap-3">
                      {logo ? (
                        <img src={logo} alt="Logo" className="w-16 h-16 rounded-xl object-contain border border-gray-200 dark:border-gray-800 bg-gray-50" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                          <IconBuildingStore className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="space-y-1">
                        <button onClick={() => setMediaTarget("logo")} className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900">Pilih Gambar</button>
                        {logo && <button onClick={() => setLogo("")} className="ml-2 text-red-500 text-xs hover:underline">Hapus</button>}
                      </div>
                    </div>
                  </div>

                  {/* Favicon */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Favicon</label>
                    <div className="flex items-center gap-3">
                      {favicon ? (
                        <img src={favicon} alt="Favicon" className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-gray-800" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                          <span className="text-gray-400 text-xs">ICO</span>
                        </div>
                      )}
                      <div className="space-y-1">
                        <button onClick={() => setMediaTarget("favicon")} className="px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900">Pilih Gambar</button>
                        {favicon && <button onClick={() => setFavicon("")} className="ml-2 text-red-500 text-xs hover:underline">Hapus</button>}
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Disarankan 512×512 px.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Warna Utama</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer" />
                    <input className={`${inputCls} w-32 font-mono`} value={themeColor} onChange={(e) => setThemeColor(e.target.value)} placeholder="#2563EB" />
                  </div>
                </div>
              </>
            )}

            {/* ── Tab 2: Kontak ──────────────────────────────── */}
            {activeTab === "kontak" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email Kontak</label>
                    <input className={inputCls} type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="redaksi@namaberita.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nomor Telepon</label>
                    <input className={inputCls} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+62 812 3456 7890" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Alamat Lengkap</label>
                  <textarea className={inputCls} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Jl. Contoh No. 123, RT 01/RW 02" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Kota</label>
                    <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Jakarta" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Provinsi</label>
                    <input className={inputCls} value={province} onChange={(e) => setProvince(e.target.value)} placeholder="DKI Jakarta" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Kode Pos</label>
                    <input className={inputCls} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="10110" />
                  </div>
                </div>
              </>
            )}

            {/* ── Tab 3: Sosial Media ────────────────────────── */}
            {activeTab === "sosial" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Instagram", value: socialInstagram, set: setSocialInstagram, placeholder: "@namaberita" },
                  { label: "X (Twitter)", value: socialX, set: setSocialX, placeholder: "@namaberita" },
                  { label: "Facebook", value: socialFacebook, set: setSocialFacebook, placeholder: "https://facebook.com/namaberita" },
                  { label: "YouTube", value: socialYoutube, set: setSocialYoutube, placeholder: "https://youtube.com/@namaberita" },
                  { label: "TikTok", value: socialTiktok, set: setSocialTiktok, placeholder: "@namaberita" },
                  { label: "LinkedIn", value: socialLinkedin, set: setSocialLinkedin, placeholder: "https://linkedin.com/company/namaberita" },
                ].map(({ label, value, set, placeholder }) => (
                  <div key={label}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
                    <input className={inputCls} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} />
                  </div>
                ))}
              </div>
            )}

            {/* ── Tab 4: Pembayaran ──────────────────────────── */}
            {activeTab === "pembayaran" && (
              <>
                <p className="text-xs text-gray-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                  Info pembayaran ini ditampilkan di frontend publik (halaman donasi, footer). Bukan untuk pembayaran subscription ke platform.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nama Badan Usaha</label>
                    <input className={inputCls} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="PT. Nama Berita Indonesia" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">NPWP <span className="normal-case font-normal">(opsional)</span></label>
                    <input className={inputCls} value={npwp} onChange={(e) => setNpwp(e.target.value)} placeholder="00.000.000.0-000.000" />
                  </div>
                </div>

                {/* Rekening Bank */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rekening Bank</label>
                    <button onClick={addBankAccount} className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700">
                      <IconPlus className="w-3.5 h-3.5" /> Tambah Rekening
                    </button>
                  </div>

                  {tenantBankAccounts.length === 0 && (
                    <p className="text-sm text-gray-400 py-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                      Belum ada rekening. Klik "Tambah Rekening" untuk menambahkan.
                    </p>
                  )}

                  <div className="space-y-3">
                    {tenantBankAccounts.map((acc, idx) => (
                      <div key={idx} className="border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-500">Rekening {idx + 1}</span>
                          <button onClick={() => removeBankAccount(idx)} className="text-red-500 hover:text-red-700">
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Nama Bank</label>
                            <input className={inputCls} value={acc.bankName} onChange={(e) => updateBankAccount(idx, "bankName", e.target.value)} placeholder="BCA, Mandiri, BNI..." />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Label <span className="normal-case font-normal">(opsional)</span></label>
                            <input className={inputCls} value={acc.label || ""} onChange={(e) => updateBankAccount(idx, "label", e.target.value)} placeholder="Rekening Donasi" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">No. Rekening</label>
                            <input className={`${inputCls} font-mono`} value={acc.accountNumber} onChange={(e) => updateBankAccount(idx, "accountNumber", e.target.value)} placeholder="1234567890" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Atas Nama</label>
                            <input className={inputCls} value={acc.accountName} onChange={(e) => updateBankAccount(idx, "accountName", e.target.value)} placeholder="Nama Pemilik" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* QRIS */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">QRIS Tenant</label>
                  <div className="flex items-center gap-4">
                    {tenantQrisImage ? (
                      <img src={tenantQrisImage} alt="QRIS" className="w-24 h-24 object-contain border border-gray-200 dark:border-gray-800 rounded-xl bg-white" />
                    ) : (
                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                        <span className="text-gray-400 text-xs">QRIS</span>
                      </div>
                    )}
                    <div className="space-y-1">
                      <button onClick={() => setMediaTarget("qris")} className="block px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900">Upload Gambar QRIS</button>
                      {tenantQrisImage && <button onClick={() => setTenantQrisImage("")} className="text-red-500 text-xs hover:underline">Hapus</button>}
                      <p className="text-[10px] text-gray-400">Format PNG/JPG, latar putih disarankan.</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Tab 5: Teknis ──────────────────────────────── */}
            {activeTab === "teknis" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Subdomain (Bawaan)</label>
                    <input className={`${inputCls} font-mono text-gray-500 cursor-not-allowed`} value={`${tenant.subdomain}.jalawarta.com`} readOnly />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Custom Domain <span className="normal-case font-normal">(opsional)</span></label>
                    <input className={inputCls} value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="www.namaberita.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Zona Waktu</label>
                    <select className={inputCls} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                      <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                      <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                      <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Bahasa</label>
                    <select className={inputCls} value={language} onChange={(e) => setLanguage(e.target.value)}>
                      <option value="id_ID">Bahasa Indonesia</option>
                      <option value="en_US">English (US)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 w-4 h-4 accent-purple-600" checked={seoIndexing} onChange={(e) => setSeoIndexing(e.target.checked)} />
                    <div>
                      <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Visibilitas Mesin Pencari</span>
                      <span className="block text-xs text-gray-500">Izinkan Google dan mesin pencari lain mengindeks situs ini.</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 w-4 h-4 accent-purple-600" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
                    <div>
                      <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">Mode Pemeliharaan</span>
                      <span className="block text-xs text-gray-500">Sembunyikan situs dari publik sementara dalam perbaikan.</span>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Teks Footer</label>
                  <textarea className={inputCls} rows={2} value={footerText} onChange={(e) => setFooterText(e.target.value)} />
                </div>
              </>
            )}

          </div>

          {/* Footer save */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            {statusMsg ? (
              <span className={`text-sm font-semibold ${statusMsg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>{statusMsg}</span>
            ) : (
              <span className="text-sm text-gray-400">Pastikan menyimpan perubahan Anda.</span>
            )}
            <button
              onClick={handleSave}
              disabled={isPending}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              {isPending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>

      <MediaLibrary
        isOpen={mediaTarget !== null}
        onClose={() => setMediaTarget(null)}
        tenantId={tenant.id}
        onSelect={onMediaSelect}
      />
    </>
  );
}
