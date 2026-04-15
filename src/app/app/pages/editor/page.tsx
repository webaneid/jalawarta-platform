import Link from "next/link";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq } from "drizzle-orm";
import PageEditorClient from "@/components/PageEditorClient";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function PagesEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/login");
  const tenantId = session.tenantId;

  const { id } = await searchParams;
  let existingPage = null;

  if (id) {
    const result = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
    existingPage = result[0] || null;
  }

  const title = existingPage
    ? typeof existingPage.title === "object" && existingPage.title !== null
      ? (existingPage.title as any).id || ""
      : String(existingPage.title || "")
    : "";

  return (
    <div className="pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/pages"
          className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {existingPage ? "Edit Halaman" : "Buat Halaman Baru"}
        </h1>
      </div>

      <PageEditorClient
        tenantId={tenantId}
        existingId={existingPage?.id}
        defaultTitle={title}
        defaultSlug={existingPage?.slug || ""}
        defaultFeaturedImage={existingPage?.featuredImage || undefined}
        defaultContent={(existingPage?.content as object) || undefined}
        defaultSeoConfig={existingPage?.seoConfig || undefined}
      />
    </div>
  );
}
