import { db } from "@/db";
import { tenants, posts, pages } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const domain = (await params).domain;
  const decodedDomain = decodeURIComponent(domain);
  
  // 1. Resolve Tenant
  // Cek apakah domain adalah subdomain (e.g. test.localhost) atau custom domain
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

  if (!tenant) {
    return new NextResponse("Tenant not found", { status: 404 });
  }

  // 2. Fetch Content
  const [allPosts, allPages] = await Promise.all([
    db.query.posts.findMany({
      where: and(eq(posts.tenantId, tenant.id), eq(posts.status, "PUBLISHED")),
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    }),
    db.query.pages.findMany({
      where: eq(pages.tenantId, tenant.id),
      orderBy: (pages, { desc }) => [desc(pages.createdAt)],
    }),
  ]);

  const baseUrl = `http://${decodedDomain}`;

  // 3. Generate XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${allPosts
    .map((post) => `
  <url>
    <loc>${baseUrl}/post/${post.slug}</loc>
    <lastmod>${post.createdAt?.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`)
    .join("")}
  ${allPages
    .map((page) => `
  <url>
    <loc>${baseUrl}/${page.slug}</loc>
    <lastmod>${page.createdAt?.toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`)
    .join("")}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
