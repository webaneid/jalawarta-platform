"use server";

import { db } from "@/db";
import { packages, users, tenants, tenantMembers, tenantPlugins, plugins, transactions, platformPaymentMethods } from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
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

export async function createTenant(data: {
  siteName: string;
  subdomain: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
  packageId: string | null;
  initialStatus: "TRIAL" | "ACTIVE";
}) {
  try {
    await verifySuperAdmin();

    // Cek subdomain unik
    const existing = await db.query.tenants.findFirst({
      where: eq(tenants.subdomain, data.subdomain.toLowerCase()),
    });
    if (existing) return { success: false, error: "Subdomain sudah digunakan." };

    // Cek email unik
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, data.ownerEmail.toLowerCase()),
    });
    if (existingUser) return { success: false, error: "Email sudah terdaftar." };

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const [newUser] = await db
      .insert(users)
      .values({
        name: data.ownerName,
        email: data.ownerEmail.toLowerCase(),
        password: hashedPassword,
        role: "TENANT_OWNER",
        isActive: true,
      })
      .returning({ id: users.id });

    const [newTenant] = await db
      .insert(tenants)
      .values({
        siteName: data.siteName,
        subdomain: data.subdomain.toLowerCase(),
        ownerId: newUser.id,
        subscriptionId: data.packageId,
        subscriptionStatus: data.initialStatus,
      })
      .returning({ id: tenants.id });

    await db.insert(tenantMembers).values({
      userId: newUser.id,
      tenantId: newTenant.id,
      role: "SUPER_ADMIN",
    });

    revalidatePath("/platform/tenants");
    return { success: true as const, tenantId: newTenant.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Methods Actions (Platform's own bank accounts & QRIS)
// ─────────────────────────────────────────────────────────────────────────────

export async function getPlatformPaymentMethods() {
  await verifySuperAdmin();
  return db.query.platformPaymentMethods.findMany({
    orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.createdAt)],
  });
}

export async function addPlatformPaymentMethod(data: {
  type: "bank_transfer" | "qris";
  label: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  qrisImage?: string;
  qrisProvider?: string;
}) {
  try {
    await verifySuperAdmin();
    await db.insert(platformPaymentMethods).values({
      type: data.type,
      label: data.label,
      bankName: data.bankName ?? null,
      accountNumber: data.accountNumber ?? null,
      accountName: data.accountName ?? null,
      qrisImage: data.qrisImage ?? null,
      qrisProvider: data.qrisProvider ?? null,
    });
    revalidatePath("/platform/payment-methods");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePlatformPaymentMethod(
  id: string,
  data: {
    label?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    qrisImage?: string;
    qrisProvider?: string;
  }
) {
  try {
    await verifySuperAdmin();
    await db.update(platformPaymentMethods).set(data).where(eq(platformPaymentMethods.id, id));
    revalidatePath("/platform/payment-methods");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function togglePlatformPaymentMethod(id: string, isActive: boolean) {
  try {
    await verifySuperAdmin();
    await db.update(platformPaymentMethods).set({ isActive }).where(eq(platformPaymentMethods.id, id));
    revalidatePath("/platform/payment-methods");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deletePlatformPaymentMethod(id: string) {
  try {
    await verifySuperAdmin();
    await db.delete(platformPaymentMethods).where(eq(platformPaymentMethods.id, id));
    revalidatePath("/platform/payment-methods");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Transactions Actions
// ─────────────────────────────────────────────────────────────────────────────

export async function getTransactions(filter?: { status?: string; tenantId?: string }) {
  await verifySuperAdmin();

  const rows = await db
    .select({
      id: transactions.id,
      invoiceNumber: transactions.invoiceNumber,
      amount: transactions.amount,
      periodMonths: transactions.periodMonths,
      paymentMethod: transactions.paymentMethod,
      status: transactions.status,
      dueDate: transactions.dueDate,
      paidAt: transactions.paidAt,
      createdAt: transactions.createdAt,
      tenantId: transactions.tenantId,
      tenantName: tenants.siteName,
      tenantSubdomain: tenants.subdomain,
      packageName: packages.name,
    })
    .from(transactions)
    .leftJoin(tenants, eq(transactions.tenantId, tenants.id))
    .leftJoin(packages, eq(transactions.packageId, packages.id))
    .orderBy(desc(transactions.createdAt));

  return rows.filter((r) => {
    if (filter?.status && r.status !== filter.status) return false;
    if (filter?.tenantId && r.tenantId !== filter.tenantId) return false;
    return true;
  });
}

export async function getTransactionDetail(id: string) {
  await verifySuperAdmin();
  const tx = await db.query.transactions.findFirst({
    where: eq(transactions.id, id),
    with: {
      tenant: true,
      package: true,
      paymentMethodRef: true,
    },
  });
  if (!tx) throw new Error("Transaksi tidak ditemukan.");
  return tx;
}

export async function createTransaction(data: {
  tenantId: string;
  packageId: string;
  periodMonths: number;
  amount: number;
  paymentMethod: "bank_transfer" | "qris" | "gateway";
  paymentMethodId?: string;
  dueDate?: Date;
}) {
  try {
    await verifySuperAdmin();
    const session = await import("@/lib/session").then((m) => m.getSession());

    // Generate invoice number
    const txCount = await db.select({ value: count() }).from(transactions);
    const seq = String((txCount[0]?.value ?? 0) + 1).padStart(4, "0");
    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${seq}`;

    await db.insert(transactions).values({
      tenantId: data.tenantId,
      packageId: data.packageId,
      invoiceNumber,
      amount: data.amount,
      periodMonths: data.periodMonths,
      paymentMethod: data.paymentMethod,
      paymentMethodId: data.paymentMethodId ?? null,
      dueDate: data.dueDate ?? null,
      createdBy: session?.userId ?? null,
    });

    revalidatePath("/platform/transactions");
    return { success: true as const, invoiceNumber };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markTransactionPaid(id: string, notes?: string) {
  try {
    await verifySuperAdmin();
    const tx = await db.query.transactions.findFirst({ where: eq(transactions.id, id) });
    if (!tx) return { success: false, error: "Transaksi tidak ditemukan." };

    await db
      .update(transactions)
      .set({ status: "PAID", paidAt: new Date(), paymentNotes: notes ?? null })
      .where(eq(transactions.id, id));

    // Aktifkan tenant
    await db
      .update(tenants)
      .set({ subscriptionStatus: "ACTIVE", subscriptionId: tx.packageId })
      .where(eq(tenants.id, tx.tenantId));

    revalidatePath("/platform/transactions");
    revalidatePath(`/platform/transactions/${id}`);
    revalidatePath(`/platform/tenants/${tx.tenantId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelTransaction(id: string) {
  try {
    await verifySuperAdmin();
    await db.update(transactions).set({ status: "CANCELLED" }).where(eq(transactions.id, id));
    revalidatePath("/platform/transactions");
    revalidatePath(`/platform/transactions/${id}`);
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

