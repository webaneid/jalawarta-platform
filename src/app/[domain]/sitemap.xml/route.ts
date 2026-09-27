import { db } from "@/db";
import { tenants, posts, pages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  // [domain] param selalu berisi slug — proxy.ts menjamin rewrite ke /{slug}/...
  const { domain } = await params;
  const slug = decodeURIComponent(domain);

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.subdomain, slug),
  });

  if (!tenant) {
    return new NextResponse("Tenant not found", { status: 404 });
  }

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

  const baseUrl = req.nextUrl.origin;

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
    headers: { "Content-Type": "application/xml" },
  });
}
