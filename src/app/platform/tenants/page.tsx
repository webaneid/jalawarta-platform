import { db } from "@/db";
import { tenants, users, packages } from "@/db/schema";
import { inArray } from "drizzle-orm";
import TenantsClient from "@/components/platform/TenantsClient";
import type { TenantRow } from "@/components/platform/TenantsClient";

export const dynamic = "force-dynamic";

export default async function PlatformTenantsPage() {
  const [allTenants, allPackages] = await Promise.all([
    db.query.tenants.findMany({
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      columns: {
        id: true,
        subdomain: true,
        siteName: true,
        customDomain: true,
        customDomainStatus: true,
        subscriptionStatus: true,
        subscriptionId: true,
        createdAt: true,
        ownerId: true,
      },
    }),
    db.select({ id: packages.id, name: packages.name }).from(packages),
  ]);

  // Batch-fetch owner info
  const ownerIds = [...new Set(allTenants.map((t) => t.ownerId))];
  const ownerRows = ownerIds.length
    ? await db
        .select({ id: users.id, name: users.name, email: users.email })
        .from(users)
        .where(inArray(users.id, ownerIds))
    : [];

  const ownerMap = new Map(ownerRows.map((u) => [u.id, u]));
  const packageMap = new Map(allPackages.map((p) => [p.id, p]));

  const rows: TenantRow[] = allTenants.map((t) => ({
    id: t.id,
    subdomain: t.subdomain,
    siteName: t.siteName,
    customDomain: t.customDomain,
    customDomainStatus: t.customDomainStatus,
    subscriptionStatus: t.subscriptionStatus,
    subscriptionId: t.subscriptionId,
    createdAt: t.createdAt,
    owner: ownerMap.get(t.ownerId) ?? null,
    package: t.subscriptionId ? (packageMap.get(t.subscriptionId) ?? null) : null,
  }));

  return <TenantsClient tenants={rows} packages={allPackages} />;
}
