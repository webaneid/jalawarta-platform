import { getTransactionDetail } from "@/app/actions/platform";
import TransactionDetailClient from "@/components/platform/TransactionDetailClient";

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tx = await getTransactionDetail(id);

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          {tx.invoiceNumber}
        </h1>
        <p className="text-gray-500 mt-1">Detail tagihan & verifikasi pembayaran.</p>
      </header>
      <TransactionDetailClient tx={tx} />
    </div>
  );
}
