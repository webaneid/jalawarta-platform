import { db } from "@/db";
import { tenants, posts } from "@/db/schema";
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

  const latestPosts = await db.query.posts.findMany({
    where: and(eq(posts.tenantId, tenant.id), eq(posts.status, "PUBLISHED")),
    orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    limit: 20,
  });

  const baseUrl = req.nextUrl.origin;

  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${tenant.siteName || slug}</title>
  <link>${baseUrl}</link>
  <description>Berita terbaru dari ${tenant.siteName || slug}</description>
  <language>id-id</language>
  <atom:link href="${baseUrl}/feed" rel="self" type="application/rss+xml" />
  ${latestPosts
    .map((post) => {
      const postUrl = `${baseUrl}/post/${post.slug}`;
      const title = post.title as { id?: string; en?: string } | null;
    const content = post.content as { id?: string } | null;
    return `
  <item>
    <title><![CDATA[${title?.id || title?.en || "Untitled"}]]></title>
    <link>${postUrl}</link>
    <guid isPermaLink="true">${postUrl}</guid>
    <pubDate>${post.createdAt?.toUTCString()}</pubDate>
    <description><![CDATA[${content?.id?.substring(0, 160) || ""}...]]></description>
  </item>`;
    })
    .join("")}
</channel>
</rss>`;

  return new NextResponse(rss, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
