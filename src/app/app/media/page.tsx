import { getMedia } from "@/app/actions/media";
import MediaManagerClient from "@/components/MediaManagerClient";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getTenantSettings } from "@/app/actions/settings";

export default async function MediaPage() {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/login");
  const tenantId = session.tenantId;

  const allMedia = await getMedia(tenantId);
  const tenantSettings = await getTenantSettings(tenantId);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Media Library</h1>
          <p className="text-sm text-gray-500">
            {allMedia.length} berkas tersimpan dalam repositori cloud Anda.
          </p>
        </div>
      </div>
      <MediaManagerClient tenantId={tenantId} initialMedia={allMedia as any[]} tenantConfig={tenantSettings?.schemaConfig || {}} />
    </div>
  );
}
