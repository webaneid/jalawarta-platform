"use server";

import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

async function verifySuperAdmin() {
  const session = await getSession();
  if (!session?.email) throw new Error("Unauthorized");
  const user = await db.query.users.findFirst({
    where: eq(users.email, session.email as string),
    columns: { role: true },
  });
  if (!user || user.role !== "PLATFORM_ADMIN") throw new Error("Unauthorized");
}

export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "SUSPENDED" | "EXPIRED";
export type CustomDomainStatus = "none" | "pending" | "active" | "failed";

export async function updateTenantSubscription(
  tenantId: string,
  data: { subscriptionId?: string | null; subscriptionStatus?: SubscriptionStatus }
) {
  await verifySuperAdmin();
  await db.update(tenants).set(data).where(eq(tenants.id, tenantId));
  revalidatePath("/platform/tenants");
  return { success: true };
}

export async function setTenantCustomDomainStatus(
  tenantId: string,
  status: CustomDomainStatus
) {
  await verifySuperAdmin();
  await db
    .update(tenants)
    .set({
      customDomainStatus: status,
      customDomainVerifiedAt: status === "active" ? new Date() : null,
    })
    .where(eq(tenants.id, tenantId));
  revalidatePath("/platform/tenants");
  return { success: true };
}
