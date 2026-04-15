import { db } from "@/db";
import { packages } from "@/db/schema";
import PackagesClient from "@/components/PackagesClient";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function PackagesAdminPage() {
  const existingPackages = await db.query.packages.findMany({
    orderBy: [desc(packages.price)],
  });

  return <PackagesClient existingPackages={existingPackages} />;
}
