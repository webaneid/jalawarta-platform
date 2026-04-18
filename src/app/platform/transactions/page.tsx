import { getTransactions, getPlatformPaymentMethods, getTenants } from "@/app/actions/platform";
import { db } from "@/db";
import { packages } from "@/db/schema";
import { eq } from "drizzle-orm";
import TransactionsClient from "@/components/platform/TransactionsClient";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const [txList, methods, tenantList, allPackages] = await Promise.all([
    getTransactions(),
    getPlatformPaymentMethods(),
    getTenants(),
    db.select({ id: packages.id, name: packages.name, price: packages.price }).from(packages).where(eq(packages.isActive, true)),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Transaksi</h1>
        <p className="text-gray-500 mt-1">Manajemen tagihan subscription tenant dan verifikasi pembayaran.</p>
      </header>
      <TransactionsClient
        transactions={txList}
        paymentMethods={methods}
        tenants={tenantList}
        packages={allPackages}
      />
    </div>
  );
}
