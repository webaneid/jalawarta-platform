"use client";

import { useState, useTransition } from "react";
import { updateTenantSubscription, setTenantCustomDomainStatus } from "@/app/actions/platform-tenants";
import type { SubscriptionStatus, CustomDomainStatus } from "@/app/actions/platform-tenants";

export type TenantRow = {
  id: string;
  subdomain: string;
  siteName: string | null;
  customDomain: string | null;
  customDomainStatus: "none" | "pending" | "active" | "failed";
  subscriptionStatus: string | null;
  subscriptionId: string | null;
  createdAt: Date | null;
  owner: { name: string | null; email: string | null } | null;
  package: { name: string } | null;
};

type PackageOption = { id: string; name: string };

const STATUS_STYLES: Record<string, string> = {
  TRIAL: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  SUSPENDED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  EXPIRED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const DOMAIN_STATUS_STYLES: Record<string, string> = {
  none: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

export default function TenantsClient({
  tenants,
  packages,
}: {
  tenants: TenantRow[];
  packages: PackageOption[];
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ id: string; msg: string } | null>(null);

  const filtered = tenants.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      t.subdomain.includes(q) ||
      (t.siteName?.toLowerCase().includes(q) ?? false) ||
      (t.owner?.email?.toLowerCase().includes(q) ?? false) ||
      (t.customDomain?.toLowerCase().includes(q) ?? false);
    const matchStatus =
      filterStatus === "ALL" || t.subscriptionStatus === filterStatus;
    return matchSearch && matchStatus;
  });

  function notify(id: string, msg: string) {
    setFeedback({ id, msg });
    setTimeout(() => setFeedback(null), 3000);
  }

  function handleStatusChange(tenantId: string, status: SubscriptionStatus) {
    startTransition(async () => {
      const r = await updateTenantSubscription(tenantId, { subscriptionStatus: status });
      if (r.success) notify(tenantId, "Status diperbarui");
    });
  }

  function handlePackageChange(tenantId: string, packageId: string) {
    startTransition(async () => {
      const r = await updateTenantSubscription(tenantId, {
        subscriptionId: packageId || null,
      });
      if (r.success) notify(tenantId, "Paket diperbarui");
    });
  }

  function handleDomainStatusChange(tenantId: string, status: CustomDomainStatus) {
    startTransition(async () => {
      const r = await setTenantCustomDomainStatus(tenantId, status);
      if (r.success) notify(tenantId, "Status domain diperbarui");
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Semua Tenants
          </h1>
          <p className="text-gray-500 mt-1">
            {tenants.length} tenant terdaftar
          </p>
        </div>
      </header>

      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Cari nama, subdomain, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="ALL">Semua Status</option>
          <option value="TRIAL">Trial</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Tenant</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Owner</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Paket</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Custom Domain</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Bergabung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                    Tidak ada tenant yang cocok.
                  </td>
                </tr>
              )}
              {filtered.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                  {/* Tenant info */}
                  <td className="px-5 py-4">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {tenant.siteName || tenant.subdomain}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {tenant.subdomain}.jalawarta.com
                    </div>
                    {feedback?.id === tenant.id && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                        {feedback.msg}
                      </div>
                    )}
                  </td>

                  {/* Owner */}
                  <td className="px-5 py-4">
                    <div className="text-gray-900 dark:text-white">{tenant.owner?.name ?? "—"}</div>
                    <div className="text-xs text-gray-400">{tenant.owner?.email ?? "—"}</div>
                  </td>

                  {/* Package selector */}
                  <td className="px-5 py-4">
                    <select
                      defaultValue={tenant.subscriptionId ?? ""}
                      onChange={(e) => handlePackageChange(tenant.id, e.target.value)}
                      disabled={isPending}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                      <option value="">— Tanpa Paket —</option>
                      {packages.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>

                  {/* Subscription status selector */}
                  <td className="px-5 py-4">
                    <select
                      defaultValue={tenant.subscriptionStatus ?? "TRIAL"}
                      onChange={(e) => handleStatusChange(tenant.id, e.target.value as SubscriptionStatus)}
                      disabled={isPending}
                      className={`px-2 py-1.5 rounded-lg border-0 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 ${STATUS_STYLES[tenant.subscriptionStatus ?? "TRIAL"] ?? STATUS_STYLES.TRIAL}`}
                    >
                      <option value="TRIAL">Trial</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </td>

                  {/* Custom domain + status */}
                  <td className="px-5 py-4">
                    {tenant.customDomain ? (
                      <div className="space-y-1.5">
                        <div className="text-xs text-gray-700 dark:text-gray-300 font-mono truncate max-w-[160px]">
                          {tenant.customDomain}
                        </div>
                        <select
                          defaultValue={tenant.customDomainStatus}
                          onChange={(e) => handleDomainStatusChange(tenant.id, e.target.value as CustomDomainStatus)}
                          disabled={isPending}
                          className={`px-2 py-1 rounded-lg border-0 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 ${DOMAIN_STATUS_STYLES[tenant.customDomainStatus]}`}
                        >
                          <option value="none">None</option>
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="failed">Failed</option>
                        </select>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* Created at */}
                  <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                    {tenant.createdAt
                      ? new Date(tenant.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
