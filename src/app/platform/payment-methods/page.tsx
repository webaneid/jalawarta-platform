import { getPlatformPaymentMethods } from "@/app/actions/platform";
import PaymentMethodsClient from "@/components/platform/PaymentMethodsClient";

export const dynamic = "force-dynamic";

export default async function PaymentMethodsPage() {
  const methods = await getPlatformPaymentMethods();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Metode Pembayaran</h1>
        <p className="text-gray-500 mt-1">Kelola rekening bank dan QRIS platform yang ditampilkan ke tenant saat membayar subscription.</p>
      </header>
      <PaymentMethodsClient methods={methods} />
    </div>
  );
}
