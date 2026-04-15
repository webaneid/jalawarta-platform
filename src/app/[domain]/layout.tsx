import type { Metadata } from "next";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { PluginSlot } from "@/components/PluginSlot";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ domain: string }> }): Promise<Metadata> {
  const domain = (await params).domain;
  
  // Simulasi pemanggilan database Drizzle untuk SEO per-Tenant
  // const tenant = await db.query.tenants.findFirst({ ... })
  
  return {
    title: `Portal Berita - ${decodeURIComponent(domain)}`,
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
  const domain = (await params).domain;
  const decodedDomain = decodeURIComponent(domain);

  // Resolve Tenant
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost";
  const subdomain = decodedDomain.endsWith(`.${rootDomain}`) 
    ? decodedDomain.replace(`.${rootDomain}`, "") 
    : null;

  const tenant = await db.query.tenants.findFirst({
    where: or(
      subdomain ? eq(tenants.subdomain, subdomain) : undefined,
      eq(tenants.customDomain, decodedDomain)
    ),
  });

  if (!tenant) notFound();

  return (
    <>
      {/* Plugin di posisi Header (e.g. Google Analytics) */}
      <PluginSlot tenantId={tenant.id} position="header" />
      
      {children}

      {/* Plugin di posisi Footer */}
      <PluginSlot tenantId={tenant.id} position="footer" />
    </>
  );
}
