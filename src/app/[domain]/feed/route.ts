import { db } from "@/db";
import { tenants, posts } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const domain = (await params).domain;
  const decodedDomain = decodeURIComponent(domain);
  
  // 1. Resolve Tenant
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

  // 2. Fetch Content (Latest 20 posts)
  const latestPosts = await db.query.posts.findMany({
    where: and(eq(posts.tenantId, tenant.id), eq(posts.status, "PUBLISHED")),
    orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    limit: 20,
  });

  const baseUrl = `http://${decodedDomain}`;

  // 3. Generate RSS XML
  const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${tenant.siteName || decodedDomain}</title>
  <link>${baseUrl}</link>
  <description>Berita terbaru dari ${tenant.siteName || decodedDomain}</description>
  <language>id-id</language>
  <atom:link href="${baseUrl}/feed" rel="self" type="application/rss+xml" />
  ${latestPosts
    .map((post) => {
      const postUrl = `${baseUrl}/post/${post.slug}`;
      return `
  <item>
    <title><![CDATA[${(post.title as any)?.id || (post.title as any)?.en || "Untitled"}]]></title>
    <link>${postUrl}</link>
    <guid isPermaLink="true">${postUrl}</guid>
    <pubDate>${post.createdAt?.toUTCString()}</pubDate>
    <description><![CDATA[${(post.content as any)?.id?.substring(0, 160) || ""}...]]></description>
  </item>`;
    })
    .join("")}
</channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
