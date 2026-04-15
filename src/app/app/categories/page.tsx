import { getCategories } from "@/app/actions/categories";
import CategoryManager from "./CategoryManager";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function CategoriesPage() {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/login");
  const tenantId = session.tenantId;

  const allCategories = await getCategories(tenantId);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Kategori</h1>
          <p className="text-sm text-gray-500">{allCategories.length} kategori tersimpan.</p>
        </div>
      </div>
      <CategoryManager tenantId={tenantId} initialCategories={allCategories} />
    </div>
  );
}
