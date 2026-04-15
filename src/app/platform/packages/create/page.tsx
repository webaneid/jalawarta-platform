import { db } from "@/db";
import { plugins } from "@/db/schema";
import PackageForm from "@/components/platform/PackageForm";

export default async function CreatePackagePage() {
  const allAddons = await db.query.plugins.findMany();

  return <PackageForm availableAddons={allAddons} />;
}
