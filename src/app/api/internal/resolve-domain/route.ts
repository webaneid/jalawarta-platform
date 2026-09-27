import { db } from "@/db";
import { tenants } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "jalawarta.com";

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get("domain");
  if (!domain) {
    return NextResponse.json({ error: "missing_domain" }, { status: 400 });
  }

  // Cek apakah domain adalah subdomain platform (mis. webane.jalawarta.com atau webane.localhost)
  const subdomainSlug =
    domain.endsWith(`.${ROOT}`) ? domain.slice(0, -(ROOT.length + 1)) :
    domain.endsWith(".localhost") ? domain.slice(0, -(".localhost".length)) :
    null;

  let tenant;

  if (subdomainSlug) {
    // Subdomain tenant — langsung match ke kolom subdomain
    tenant = await db.query.tenants.findFirst({
      where: eq(tenants.subdomain, subdomainSlug),
      columns: { id: true, subdomain: true },
    });
  } else {
    // Custom domain — hanya resolve jika status sudah active
    tenant = await db.query.tenants.findFirst({
      where: and(
        eq(tenants.customDomain, domain),
        eq(tenants.customDomainStatus, "active"),
      ),
      columns: { id: true, subdomain: true },
    });
  }

  if (!tenant) {
    return NextResponse.json({ error: "domain_not_found" }, { status: 404 });
  }

  return NextResponse.json({ slug: tenant.subdomain, tenantId: tenant.id });
}
