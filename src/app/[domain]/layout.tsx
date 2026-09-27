import type { Metadata } from "next";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PluginSlot } from "@/components/PluginSlot";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }): Promise<Metadata> {
  const { domain } = await params;
  const slug = decodeURIComponent(domain);

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.subdomain, slug),
    columns: { siteName: true },
  });

  return {
    title: tenant?.siteName ? `Portal Berita - ${tenant.siteName}` : "Portal Berita",
    description: "Dibangun dengan ekosistem Jala Warta v0.0.1",
  };
}

export default async function TenantLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ domain: string }>;
}) {
  // [domain] param selalu berisi slug (bukan hostname) — proxy.ts menjamin rewrite ke /{slug}/...
  const { domain } = await params;
  const slug = decodeURIComponent(domain);

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.subdomain, slug),
  });

  if (!tenant) notFound();

  return (
    <>
      <PluginSlot tenantId={tenant.id} position="header" />
      {children}
      <PluginSlot tenantId={tenant.id} position="footer" />
    </>
  );
}
