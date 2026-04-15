import { db } from "@/db";
import { plugins } from "@/db/schema";
import AddonsClient from "@/components/platform/AddonsClient";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function PlatformAddonsPage() {
  const allAddons = await db.query.plugins.findMany({
    orderBy: [desc(plugins.createdAt)],
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Ecosystem Add-ons</h1>
        <p className="text-gray-500 mt-2">Daftar semua ekstensi dan modul yang tersedia untuk diaktifkan oleh Tenant.</p>
      </header>

      <AddonsClient addons={allAddons} />
    </div>
  );
}
