import { getTenantDetail } from "@/app/actions/platform";
import { db } from "@/db";
import { packages } from "@/db/schema";
import TenantDetailClient from "@/components/platform/TenantDetailClient";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let detail;
  try {
    detail = await getTenantDetail(id);
  } catch {
    notFound();
  }

  const allPackages = await db.query.packages.findMany();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/platform/tenants"
          className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          ← Semua Tenants
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          {detail.tenant.siteName || detail.tenant.subdomain}
        </h1>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            detail.tenant.subscriptionStatus === "ACTIVE"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : detail.tenant.subscriptionStatus === "SUSPENDED"
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : detail.tenant.subscriptionStatus === "EXPIRED"
              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          {detail.tenant.subscriptionStatus}
        </span>
      </div>

      <TenantDetailClient detail={detail} allPackages={allPackages} />
    </div>
  );
}
