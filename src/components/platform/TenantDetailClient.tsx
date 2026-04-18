"use client";

import { useState } from "react";
import { updateTenantSubscription, updateTenantStatus } from "@/app/actions/platform";

type DetailProps = {
  detail: {
    tenant: {
      id: string;
      subdomain: string;
      customDomain: string | null;
      siteName: string | null;
      subscriptionId: string | null;
      subscriptionStatus: string | null;
      createdAt: Date | null;
    };
    owner: { id: string; name: string | null; email: string | null } | null | undefined;
    pkg: { id: string; name: string; price: number; limits: unknown; features: unknown } | null | undefined;
    members: { id: string | null; name: string | null; email: string | null; role: string }[];
    activeAddons: { pluginId: string; status: string; pluginName: string | null }[];
  };
  allPackages: { id: string; name: string; price: number }[];
};

const STATUS_OPTIONS = ["TRIAL", "ACTIVE", "EXPIRED", "SUSPENDED"] as const;

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  INACTIVE: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  TRIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  EXPIRED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  SUSPENDED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function TenantDetailClient({ detail, allPackages }: DetailProps) {
  const { tenant, owner, pkg, members, activeAddons } = detail;
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [selectedPkg, setSelectedPkg] = useState(tenant.subscriptionId ?? "");
  const [selectedStatus, setSelectedStatus] = useState(
    (tenant.subscriptionStatus as "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED") ?? "TRIAL"
  );

  async function handleSave() {
    setSaving(true);
    setMsg("");
    const [pkgRes, statusRes] = await Promise.all([
      updateTenantSubscription(tenant.id, selectedPkg || null),
      updateTenantStatus(tenant.id, selectedStatus),
    ]);
    if (!pkgRes.success || !statusRes.success) {
      setMsg(pkgRes.error || statusRes.error || "Gagal menyimpan.");
    } else {
      setMsg("✅ Perubahan tersimpan.");
    }
    setSaving(false);
  }

  const limits = pkg?.limits as Record<string, number> | null;
  const features = pkg?.features as Record<string, string[]> | null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Kolom Kiri — Info & Kontrol */}
      <div className="lg:col-span-1 space-y-4">

        {/* Info dasar */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Info Tenant</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Subdomain</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{tenant.subdomain}</dd>
            </div>
            {tenant.customDomain && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Custom Domain</dt>
                <dd className="font-medium text-gray-900 dark:text-white">{tenant.customDomain}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Owner</dt>
              <dd className="font-medium text-gray-900 dark:text-white">{owner?.name || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900 dark:text-white text-xs">{owner?.email || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Terdaftar</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString("id-ID") : "—"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Kontrol paket & status */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kelola Langganan</h3>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Paket SaaS</label>
            <select
              value={selectedPkg}
              onChange={(e) => setSelectedPkg(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
            >
              <option value="">— Tanpa Paket —</option>
              {allPackages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.price > 0 ? `(Rp ${p.price.toLocaleString("id-ID")})` : "(Gratis)"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Status Langganan</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-black text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>

          {msg && (
            <p className="text-xs text-center font-medium text-gray-600 dark:text-gray-400">{msg}</p>
          )}
        </div>

        {/* Kuota paket aktif */}
        {limits && (
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kuota Paket: {pkg?.name}</h3>
            <dl className="space-y-2 text-sm">
              {Object.entries(limits).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">
                    {k === "maxStorage" ? `${Math.round(Number(v) / 1024 / 1024)} MB` : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
            {features?.allowedAddons && features.allowedAddons.length > 0 && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 mb-1.5">Add-ons diizinkan:</p>
                <div className="flex flex-wrap gap-1">
                  {features.allowedAddons.map((a: string) => (
                    <span key={a} className="text-xs px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-full">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Kolom Kanan — Members & Add-ons */}
      <div className="lg:col-span-2 space-y-4">

        {/* Members */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Tim Redaksi ({members.length} orang)
            </h3>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada anggota terdaftar.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {members.map((m) => (
                  <tr key={m.id} className="px-5 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-900/20">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{m.name || "—"}</p>
                      <p className="text-xs text-gray-400">{m.email}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                        {m.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Add-ons aktif */}
        <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Add-ons ({activeAddons.length} terpasang)
            </h3>
          </div>
          {activeAddons.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Belum ada add-on diaktifkan.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {activeAddons.map((a) => (
                <div key={a.pluginId} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {a.pluginName || a.pluginId}
                    </p>
                    <p className="text-xs text-gray-400">{a.pluginId}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${STATUS_BADGE[a.status] ?? STATUS_BADGE.INACTIVE}`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
