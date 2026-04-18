import { db } from "@/db";
import { packages } from "@/db/schema";
import { eq } from "drizzle-orm";
import CreateTenantClient from "@/components/platform/CreateTenantClient";

export const dynamic = "force-dynamic";

export default async function CreateTenantPage() {
  const allPackages = await db
    .select({ id: packages.id, name: packages.name, price: packages.price })
    .from(packages)
    .where(eq(packages.isActive, true));

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Buat Tenant Baru</h1>
        <p className="text-gray-500 mt-1">Daftarkan portal berita baru ke platform Jala Warta.</p>
      </header>
      <CreateTenantClient packages={allPackages} />
    </div>
  );
}
