import { getTenantBilling } from "@/app/actions/settings";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import BillingClient from "./BillingClient";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getSession();
  if (!session?.tenantId) redirect("/login");

  const { transactions, paymentMethods } = await getTenantBilling();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tagihan & Pembayaran</h1>
        <p className="text-sm text-gray-500">Riwayat tagihan subscription dan informasi cara pembayaran ke platform.</p>
      </header>
      <BillingClient transactions={transactions} paymentMethods={paymentMethods} tenantId={session.tenantId} />
    </div>
  );
}
