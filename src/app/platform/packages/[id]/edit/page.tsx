import { db } from "@/db";
import { packages, plugins } from "@/db/schema";
import PackageForm from "@/components/platform/PackageForm";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const pkg = await db.query.packages.findFirst({
    where: eq(packages.id, id)
  });

  if (!pkg) notFound();

  const allAddons = await db.query.plugins.findMany();

  return <PackageForm initialData={pkg} availableAddons={allAddons} />;
}
