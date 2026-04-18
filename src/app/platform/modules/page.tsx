import { db } from "@/db";
import { packages } from "@/db/schema";
import ModulesClient from "@/components/platform/ModulesClient";

export const dynamic = "force-dynamic";

export default async function PlatformModulesPage() {
  const allPackages = await db.query.packages.findMany();

  // Ekstrak allowedModules per paket untuk ditampilkan di tiap module card
  const packageModuleMap = allPackages.map((p) => ({
    id: p.id,
    name: p.name,
    allowedModules: ((p.features as any)?.allowedModules ?? []) as string[],
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Core Modules
        </h1>
        <p className="text-gray-500 mt-2">
          Fitur bawaan platform yang menjadi fondasi sistem Jala Warta. Semua modul tersedia di setiap paket.
        </p>
      </header>

      <ModulesClient packageModuleMap={packageModuleMap} />
    </div>
  );
}
