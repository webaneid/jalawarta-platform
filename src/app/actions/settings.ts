"use server";

import { db } from "@/db";
import { tenants, transactions, platformPaymentMethods } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export async function getTenantSettings(tenantId: string) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
    
  return tenant || null;
}

export type UpdateSettingsData = {
  siteName?: string | null;
  customDomain?: string | null;
  schemaConfig?: any;
};

export async function updateTenantSettings(tenantId: string, data: UpdateSettingsData) {
  try {
    const session = await getSession();
    if (!session || session.tenantId !== tenantId) {
      throw new Error("Unauthorized");
    }

    // Process customDomain: Convert empty string to null to avoid unique constraint issues
    const finalCustomDomain = data.customDomain && data.customDomain.trim() !== "" 
      ? data.customDomain.trim() 
      : null;

    await db
      .update(tenants)
      .set({
        siteName: data.siteName,
        customDomain: finalCustomDomain,
        schemaConfig: data.schemaConfig,
      })
      .where(eq(tenants.id, tenantId));

    revalidatePath("/app/settings");
    return { success: true };
  } catch (err: any) {
    if (err.code === "23505" && err.message.includes("custom_domain")) {
      return { success: false, error: "Custom domain sudah digunakan oleh pihak lain." };
    }
    return { success: false, error: err.message };
  }
}

// ── Billing ─────────────────────────────────────────────────

export async function getTenantBilling() {
  const session = await getSession();
  if (!session?.tenantId) return { transactions: [], paymentMethods: [] };

  const txList = await db
    .select({
      id: transactions.id,
      invoiceNumber: transactions.invoiceNumber,
      amount: transactions.amount,
      periodMonths: transactions.periodMonths,
      paymentMethod: transactions.paymentMethod,
      status: transactions.status,
      paymentProof: transactions.paymentProof,
      dueDate: transactions.dueDate,
      paidAt: transactions.paidAt,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .where(eq(transactions.tenantId, session.tenantId))
    .orderBy(desc(transactions.createdAt));

  const methods = await db
    .select({
      id: platformPaymentMethods.id,
      type: platformPaymentMethods.type,
      label: platformPaymentMethods.label,
      bankName: platformPaymentMethods.bankName,
      accountNumber: platformPaymentMethods.accountNumber,
      accountName: platformPaymentMethods.accountName,
      qrisImage: platformPaymentMethods.qrisImage,
      qrisProvider: platformPaymentMethods.qrisProvider,
    })
    .from(platformPaymentMethods)
    .where(eq(platformPaymentMethods.isActive, true));

  return { transactions: txList, paymentMethods: methods };
}

export async function uploadPaymentProof(transactionId: string, proofUrl: string) {
  try {
    const session = await getSession();
    if (!session?.tenantId) return { success: false, error: "Unauthorized" };

    // Verifikasi transaksi milik tenant ini
    const tx = await db.query.transactions.findFirst({
      where: eq(transactions.id, transactionId),
    });
    if (!tx || tx.tenantId !== session.tenantId) return { success: false, error: "Transaksi tidak ditemukan." };
    if (tx.status === "PAID" || tx.status === "CANCELLED") return { success: false, error: "Status transaksi tidak bisa diubah." };

    await db
      .update(transactions)
      .set({ paymentProof: proofUrl, status: "AWAITING_VERIFICATION" })
      .where(eq(transactions.id, transactionId));

    revalidatePath("/app/settings/billing");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
