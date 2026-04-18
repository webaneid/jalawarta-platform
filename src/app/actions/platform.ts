"use server";

import { db } from "@/db";
import { packages, users, tenants, tenantMembers, tenantPlugins, plugins } from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function verifySuperAdmin() {
  const session = await getSession();
  if (!session?.email) throw new Error("Unauthorized");
  
  const user = await db.query.users.findFirst({
    where: eq(users.email, session.email)
  });
  
  if (!user || user.role !== "PLATFORM_ADMIN") {
    throw new Error("Forbidden: Requires Platform Admin");
  }
}

export async function savePackage(data: {
  id: string;
  name: string;
  description: string | null;
  price: number;
  maxUsers: number;
  maxPosts: number;
  maxStorageMB: number;
  aiCreditsLimit: number;
  aiImageCreditsLimit: number;
  allowedModules: string[];
  allowedAddons: string[];
  isActive: boolean;
}) {
  try {
    await verifySuperAdmin();
    
    // Transform flat limits to JSONB
    const limits = {
       maxUsers: data.maxUsers,
       maxPosts: data.maxPosts,
       maxStorage: data.maxStorageMB * 1024 * 1024, // convert MB to bytes
       aiCreditsLimit: data.aiCreditsLimit,
       aiImageCreditsLimit: data.aiImageCreditsLimit,
    };

    const features = {
       allowedModules: data.allowedModules,
       allowedAddons: data.allowedAddons,
    };
    
    // UPSERT semantic
    await db.insert(packages).values({
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      limits,
      features,
      isActive: data.isActive,
    }).onConflictDoUpdate({
      target: packages.id,
      set: {
        name: data.name,
        description: data.description || "",
        price: data.price,
        limits,
        features,
        isActive: data.isActive,
      }
    });

    revalidatePath("/platform/packages");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Management Actions
// ─────────────────────────────────────────────────────────────────────────────

export async function getTenants() {
  await verifySuperAdmin();

  const rows = await db
    .select({
      id: tenants.id,
      subdomain: tenants.subdomain,
      customDomain: tenants.customDomain,
      siteName: tenants.siteName,
      subscriptionId: tenants.subscriptionId,
      subscriptionStatus: tenants.subscriptionStatus,
      createdAt: tenants.createdAt,
      ownerName: users.name,
      ownerEmail: users.email,
      packageName: packages.name,
    })
    .from(tenants)
    .leftJoin(users, eq(tenants.ownerId, users.id))
    .leftJoin(packages, eq(tenants.subscriptionId, packages.id))
    .orderBy(desc(tenants.createdAt));

  // Count members per tenant in a separate pass (drizzle doesn't support correlated subqueries cleanly)
  const memberCounts = await db
    .select({ tenantId: tenantMembers.tenantId, memberCount: count() })
    .from(tenantMembers)
    .groupBy(tenantMembers.tenantId);

  const countMap = Object.fromEntries(memberCounts.map((r) => [r.tenantId, Number(r.memberCount)]));

  return rows.map((r) => ({
    ...r,
    memberCount: countMap[r.id] ?? 0,
  }));
}

export async function getTenantDetail(tenantId: string) {
  await verifySuperAdmin();

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });
  if (!tenant) throw new Error("Tenant tidak ditemukan");

  const owner = await db.query.users.findFirst({
    where: eq(users.id, tenant.ownerId),
  });

  const pkg = tenant.subscriptionId
    ? await db.query.packages.findFirst({ where: eq(packages.id, tenant.subscriptionId) })
    : null;

  const members = await db
    .select({ id: users.id, name: users.name, email: users.email, role: tenantMembers.role })
    .from(tenantMembers)
    .leftJoin(users, eq(tenantMembers.userId, users.id))
    .where(eq(tenantMembers.tenantId, tenantId));

  const activeAddons = await db
    .select({ pluginId: tenantPlugins.pluginId, status: tenantPlugins.status, pluginName: plugins.name })
    .from(tenantPlugins)
    .leftJoin(plugins, eq(tenantPlugins.pluginId, plugins.id))
    .where(eq(tenantPlugins.tenantId, tenantId));

  return { tenant, owner, pkg, members, activeAddons };
}

export async function updateTenantSubscription(tenantId: string, packageId: string | null) {
  try {
    await verifySuperAdmin();
    await db
      .update(tenants)
      .set({ subscriptionId: packageId })
      .where(eq(tenants.id, tenantId));
    revalidatePath("/platform/tenants");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTenantStatus(tenantId: string, status: "TRIAL" | "ACTIVE" | "EXPIRED" | "SUSPENDED") {
  try {
    await verifySuperAdmin();
    await db
      .update(tenants)
      .set({ subscriptionStatus: status })
      .where(eq(tenants.id, tenantId));
    revalidatePath("/platform/tenants");
    revalidatePath(`/platform/tenants/${tenantId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin / Add-on Registry Actions
// ─────────────────────────────────────────────────────────────────────────────

export async function registerPlugin(data: {
  id: string;
  name: string;
  description: string;
}) {
  try {
    await verifySuperAdmin();
    await db.insert(plugins).values({
      id: data.id,
      name: data.name,
      description: data.description,
    });
    revalidatePath("/platform/addons");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

