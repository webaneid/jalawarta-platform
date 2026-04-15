import { XMLBuilder } from "fast-xml-parser";
import { db } from "@/db";
import { posts, pages, media, categories, tags, postCategories, postTags } from "@/db/schema";
import { tiptapToHtml } from "../converters/content-engine";
import { eq, and, inArray } from "drizzle-orm";

export async function generateWxrExport(tenantId: string, options: { type?: "all" | "post" | "page" | "media" } = { type: "all" }) {
  const channel: any = {
    title: "Jala Warta Export",
    link: "https://jalawarta.com",
    description: "Multi-tenant News Platform",
    pubDate: new Date().toUTCString(),
    language: "id-ID",
    "wp:wxr_version": "1.2",
    "wp:base_site_url": "https://jalawarta.com",
    "wp:base_blog_url": "https://jalawarta.com",
    item: [],
  };

  // 1. Fetch Categories & Tags
  const allCats = await db.select().from(categories).where(eq(categories.tenantId, tenantId));
  const allTgs = await db.select().from(tags).where(eq(tags.tenantId, tenantId));

  allCats.forEach(c => {
    channel["wp:category"] = channel["wp:category"] || [];
    channel["wp:category"].push({
      "wp:term_id": Math.floor(Math.random() * 100000),
      "wp:category_nicename": c.slug,
      "wp:category_parent": "",
      "wp:cat_name": c.name,
    });
  });

  // 2. Export Media
  if (options.type === "all" || options.type === "media") {
    const allMedia = await db.select().from(media).where(eq(media.tenantId, tenantId));
    for (const m of allMedia) {
      channel.item.push({
        title: m.filename,
        link: m.url,
        pubDate: m.createdAt?.toUTCString(),
        "guid": { "@_isPermaLink": "false", "#text": m.url },
        description: m.description || "",
        "content:encoded": "",
        "excerpt:encoded": "",
        "wp:post_id": Math.floor(Math.random() * 100000),
        "wp:post_date": m.createdAt?.toISOString().slice(0, 19).replace("T", " "),
        "wp:status": "inherit",
        "wp:post_type": "attachment",
        "wp:attachment_url": m.url,
        "wp:postmeta": [
          { "wp:meta_key": "_wp_attachment_image_alt", "wp:meta_value": m.altText || "" }
        ]
      });
    }
  }

  // 3. Export Posts
  if (options.type === "all" || options.type === "post") {
    const allPosts = await db.select().from(posts).where(eq(posts.tenantId, tenantId));
    for (const p of allPosts) {
        // Get categories & tags for this post
        const pCats = await db.select({ name: categories.name, slug: categories.slug })
            .from(postCategories)
            .innerJoin(categories, eq(postCategories.categoryId, categories.id))
            .where(eq(postCategories.postId, p.id));
            
        const pTags = await db.select({ name: tags.name, slug: tags.slug })
            .from(postTags)
            .innerJoin(tags, eq(postTags.tagId, tags.id))
            .where(eq(postTags.postId, p.id));

        const item: any = {
           title: (p.title as any)?.id || "Untitled",
           link: `/post/${p.slug}`,
           pubDate: p.createdAt?.toUTCString(),
           "dc:creator": "admin",
           "guid": { "@_isPermaLink": "false", "#text": p.id },
           "description": "",
           "content:encoded": `<![CDATA[${tiptapToHtml(p.content)}]]>`,
           "excerpt:encoded": "",
           "wp:post_id": Math.floor(Math.random() * 100000),
           "wp:post_date": p.createdAt?.toISOString().slice(0, 19).replace("T", " "),
           "wp:post_name": p.slug,
           "wp:status": p.status === "PUBLISHED" ? "publish" : "draft",
           "wp:post_type": "post",
           category: [
               ...pCats.map(c => ({ "@_domain": "category", "@_nicename": c.slug, "#text": c.name })),
               ...pTags.map(t => ({ "@_domain": "post_tag", "@_nicename": t.slug, "#text": t.name }))
           ],
           "wp:postmeta": [
               { "wp:meta_key": "_yoast_wpseo_focuskw", "wp:meta_value": (p.seoConfig as any)?.focusKeyword || "" },
               { "wp:meta_key": "_yoast_wpseo_title", "wp:meta_value": (p.seoConfig as any)?.seoTitle || "" },
               { "wp:meta_key": "_yoast_wpseo_metadesc", "wp:meta_value": (p.seoConfig as any)?.seoDescription || "" },
           ]
        };
        channel.item.push(item);
    }
  }

  // 4. Build XML
  const builder = new XMLParserBuilder();
  const xml = builder.build({
    "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
    rss: {
      "@_version": "2.0",
      "@_xmlns:excerpt": "http://wordpress.org/export/1.2/excerpt/",
      "@_xmlns:content": "http://purl.org/rss/1.0/modules/content/",
      "@_xmlns:wfw": "http://wellformedweb.org/CommentAPI/",
      "@_xmlns:dc": "http://purl.org/dc/elements/1.1/",
      "@_xmlns:wp": "http://wordpress.org/export/1.2/",
      channel,
    }
  });

  return xml;
}

// Wrapper for XMLBuilder to match namespaced structure
class XMLParserBuilder {
    private builder: XMLBuilder;
    constructor() {
        this.builder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            format: true,
            cdataPropName: "__cdata",
        });
    }
    build(obj: any) {
        return this.builder.build(obj);
    }
}
