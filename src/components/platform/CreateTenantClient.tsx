"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTenant } from "@/app/actions/platform";

type PackageOption = { id: string; name: string; price: number };

export default function CreateTenantClient({ packages }: { packages: PackageOption[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [form, setForm] = useState({
    siteName: "",
    subdomain: "",
    ownerName: "",
    ownerEmail: "",
    password: "",
    packageId: packages[0]?.id ?? "",
    initialStatus: "TRIAL" as "TRIAL" | "ACTIVE",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // Auto-slug subdomain dari siteName jika user belum ketik manual
      ...(name === "siteName" && !prev.subdomain
        ? { subdomain: value.toLowerCase().replace(/\s+/g, "").replace(/[^\w]/g, "") }
        : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    const res = await createTenant(form);
    if (!res.success) {
      setErrorMsg(res.error || "Gagal membuat tenant.");
      setSaving(false);
      return;
    }
    router.push(`/platform/tenants/${res.tenantId}`);
  }

  const inputCls =
    "w-full px-3 py-2 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="p-6 space-y-5">
        {/* Informasi Situs */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informasi Situs</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Nama Situs <span className="text-red-500">*</span>
              </label>
              <input name="siteName" value={form.siteName} onChange={handleChange} required placeholder="Berita Nusantara" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Subdomain <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <input
                  name="subdomain"
                  value={form.subdomain}
                  onChange={handleChange}
                  required
                  placeholder="beritanusantara"
                  className={`${inputCls} rounded-r-none font-mono`}
                />
                <span className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-l-0 border-gray-200 dark:border-gray-700 rounded-r-xl text-sm text-gray-500 whitespace-nowrap">
                  .jalawarta.com
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Huruf kecil, tanpa spasi atau karakter khusus.</p>
            </div>
          </div>
        </div>

        <hr className="border-gray-100 dark:border-gray-800" />

        {/* Informasi Pemilik */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informasi Pemilik</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input name="ownerName" value={form.ownerName} onChange={handleChange} required placeholder="Budi Santoso" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input name="ownerEmail" value={form.ownerEmail} onChange={handleChange} required type="email" placeholder="budi@email.com" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Password Sementara <span className="text-red-500">*</span>
              </label>
              <input name="password" value={form.password} onChange={handleChange} required type="text" placeholder="Min. 8 karakter" minLength={8} className={`${inputCls} font-mono`} />
              <p className="text-[10px] text-gray-400 mt-1">Tenant perlu mengganti password setelah login pertama.</p>
            </div>
          </div>
        </div>

        <hr className="border-gray-100 dark:border-gray-800" />

        {/* Langganan */}
        <div>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Langganan</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Paket</label>
              <select name="packageId" value={form.packageId} onChange={handleChange} className={inputCls}>
                <option value="">— Tanpa paket —</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.price > 0 ? `(Rp ${p.price.toLocaleString("id-ID")})` : "(Gratis)"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Status Awal</label>
              <select name="initialStatus" value={form.initialStatus} onChange={handleChange} className={inputCls}>
                <option value="TRIAL">TRIAL</option>
                <option value="ACTIVE">ACTIVE</option>
              </select>
            </div>
          </div>
        </div>

        {errorMsg && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">{errorMsg}</p>
        )}
      </div>

      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/platform/tenants")}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving || !form.siteName || !form.subdomain || !form.ownerName || !form.ownerEmail || !form.password}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
        >
          {saving ? "Membuat Tenant..." : "Buat Tenant"}
        </button>
      </div>
    </form>
  );
}
