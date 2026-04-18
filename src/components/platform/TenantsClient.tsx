"use client";

import { useState } from "react";
import Link from "next/link";
import { updateTenantStatus } from "@/app/actions/platform";

type Tenant = {
  id: string;
  subdomain: string;
  customDomain: string | null;
  siteName: string | null;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  createdAt: Date | null;
  ownerName: string | null;
  ownerEmail: string | null;
  packageName: string | null;
  memberCount: number;
};

const STATUS_OPTIONS = ["TRIAL", "ACTIVE", "EXPIRED", "SUSPENDED"] as const;

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  TRIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  EXPIRED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  SUSPENDED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function TenantsClient({ tenants }: { tenants: Tenant[] }) {
  const [filter, setFilter] = useState<string>("ALL");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const filtered =
    filter === "ALL" ? tenants : tenants.filter((t) => t.subscriptionStatus === filter);

  async function handleStatusChange(
    tenantId: string,
    status: "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED"
  ) {
    setLoadingId(tenantId);
    setErrorMsg("");
    const res = await updateTenantStatus(tenantId, status);
    if (!res.success) setErrorMsg(res.error || "Gagal update status.");
    setLoadingId(null);
  }

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", ...STATUS_OPTIONS].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
              filter === s
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-purple-400"
            }`}
          >
            {s === "ALL" ? `Semua (${tenants.length})` : `${s} (${tenants.filter((t) => t.subscriptionStatus === s).length})`}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {errorMsg}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20">
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Tenant</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Owner</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Paket</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Members</th>
              <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                  Tidak ada tenant dengan status ini.
                </td>
              </tr>
            )}
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                <td className="px-5 py-4">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {t.siteName || t.subdomain}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.subdomain}.jalawarta.com
                    {t.customDomain && ` · ${t.customDomain}`}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-gray-700 dark:text-gray-300">{t.ownerName || "—"}</p>
                  <p className="text-xs text-gray-400">{t.ownerEmail || "—"}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t.packageName || <span className="italic text-gray-400">Tanpa paket</span>}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <select
                    value={t.subscriptionStatus ?? "TRIAL"}
                    disabled={loadingId === t.id}
                    onChange={(e) =>
                      handleStatusChange(t.id, e.target.value as "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED")
                    }
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-purple-500 ${
                      STATUS_BADGE[t.subscriptionStatus ?? "TRIAL"] ?? STATUS_BADGE.TRIAL
                    }`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-4 text-gray-600 dark:text-gray-400">
                  {t.memberCount} orang
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/platform/tenants/${t.id}`}
                    className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                  >
                    Detail →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
