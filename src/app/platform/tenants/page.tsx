import { getTenants } from "@/app/actions/platform";
import TenantsClient from "@/components/platform/TenantsClient";

export const dynamic = "force-dynamic";

export default async function PlatformTenantsPage() {
  const tenantList = await getTenants();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Semua Tenants
        </h1>
        <p className="text-gray-500 mt-2">
          Kelola seluruh portal berita yang terdaftar di platform Jala Warta.
        </p>
      </header>

      <TenantsClient tenants={tenantList} />
    </div>
  );
}
