import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getTenantSettings } from "@/app/actions/settings";
import ClientSettings from "./ClientSettings";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/login");

  const tenantSettings = await getTenantSettings(session.tenantId);
  if (!tenantSettings) redirect("/");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Pengaturan Situs</h1>
        <p className="text-sm text-gray-500">
          Kelola informasi umum, preferensi, dan konfigurasi dasar situs web Anda.
        </p>
      </div>

      <ClientSettings tenant={tenantSettings} />
    </div>
  );
}
