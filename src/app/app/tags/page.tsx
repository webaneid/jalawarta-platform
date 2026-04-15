import { getTags } from "@/app/actions/tags";
import TagManager from "./TagManager";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function TagsPage() {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/login");
  const tenantId = session.tenantId;

  const allTags = await getTags(tenantId);
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tag</h1>
          <p className="text-sm text-gray-500">{allTags.length} tag tersimpan.</p>
        </div>
      </div>
      <TagManager tenantId={tenantId} initialTags={allTags} />
    </div>
  );
}
