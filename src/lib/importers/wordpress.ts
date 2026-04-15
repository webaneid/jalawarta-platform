import { XMLParser } from "fast-xml-parser";
import { db } from "@/db";
import { posts, pages, media, categories, tags, postCategories, postTags } from "@/db/schema";
import { htmlToTiptap } from "../converters/content-engine";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";

export interface WxrItem {
  title: string;
  link: string;
  pubDate: string;
  "dc:creator": string;
  guid: any;
  description: string;
  "content:encoded": string;
  "excerpt:encoded": string;
  "wp:post_id": number;
  "wp:post_date": string;
  "wp:post_name": string;
  "wp:status": string;
  "wp:post_type": string;
  "wp:post_parent": number;
  "wp:attachment_url"?: string;
  category?: any;
  "wp:postmeta"?: any;
}

export async function processWxrImport(tenantId: string, xmlContent: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const jsonObj = parser.parse(xmlContent);
  const items = jsonObj.rss.channel.item;
  const itemsArray = Array.isArray(items) ? items : [items];

  const results = {
    posts: 0,
    pages: 0,
    media: 0,
    errors: [] as string[],
  };

  // 1. First Pass: Handle Attachments (Media)
  // We need media IDs to map featured images to posts
  const mediaMap = new Map<number, string>(); // wp_id -> internal_url

  for (const item of itemsArray) {
    if (item["wp:post_type"] === "attachment") {
      try {
        const url = await downloadAndSaveMedia(tenantId, item);
        if (url) {
          mediaMap.set(item["wp:post_id"], url);
          results.media++;
        }
      } catch (err: any) {
        results.errors.push(`Gagal mengimpor media ${item.title}: ${err.message}`);
      }
    }
  }

  // 2. Second Pass: Handle Posts and Pages
  for (const item of itemsArray) {
    const postType = item["wp:post_type"];
    if (postType === "post" || postType === "page") {
      try {
        const id = crypto.randomUUID();
        const slug = item["wp:post_name"] || autoSlug(item.title);
        const contentJson = htmlToTiptap(item["content:encoded"]);
        const status = item["wp:status"] === "publish" ? "PUBLISHED" : "DRAFT";
        
        // Handle Featured Image from postmeta _thumbnail_id
        let featuredImage = "";
        const postMeta = Array.isArray(item["wp:postmeta"]) ? item["wp:postmeta"] : [item["wp:postmeta"]].filter(Boolean);
        const thumbIdMeta = postMeta.find((m: any) => m["wp:meta_key"] === "_thumbnail_id");
        if (thumbIdMeta) {
          const thumbWpId = parseInt(thumbIdMeta["wp:meta_value"]);
          featuredImage = mediaMap.get(thumbWpId) || "";
        }

        // SEO Config from Meta (Yoast Logic)
        const seoConfig = {
          focusKeyword: findMeta(postMeta, "_yoast_wpseo_focuskw"),
          seoTitle: findMeta(postMeta, "_yoast_wpseo_title"),
          seoDescription: findMeta(postMeta, "_yoast_wpseo_metadesc"),
        };

        if (postType === "post") {
          await db.insert(posts).values({
            id,
            tenantId,
            slug,
            title: { id: item.title },
            content: contentJson,
            featuredImage,
            status,
            seoConfig,
            createdAt: new Date(item["wp:post_date"]),
          });

          // Handle Categories and Tags
          await processTaxonomies(id, tenantId, item.category);
          results.posts++;
        } else {
          await db.insert(pages).values({
            id,
            tenantId,
            slug,
            title: { id: item.title },
            content: contentJson,
            featuredImage,
            seoConfig,
            createdAt: new Date(item["wp:post_date"]),
          });
          results.pages++;
        }
      } catch (err: any) {
        results.errors.push(`Gagal mengimpor ${postType} ${item.title}: ${err.message}`);
      }
    }
  }

  return results;
}

/**
 * Downloads a media file from WordPress and saves it locally
 */
async function downloadAndSaveMedia(tenantId: string, item: WxrItem): Promise<string | null> {
  const remoteUrl = item["wp:attachment_url"];
  if (!remoteUrl) return null;

  try {
    const response = await fetch(remoteUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const originalName = remoteUrl.split("/").pop()?.split("?")[0] || "image.jpg";
    const extension = originalName.split(".").pop()?.toLowerCase() || "jpg";
    const uniqueFilename = `${crypto.randomUUID()}.${extension}`;
    
    const tenantDir = join(process.cwd(), "public", "uploads", tenantId);
    await mkdir(tenantDir, { recursive: true });
    await writeFile(join(tenantDir, uniqueFilename), buffer);

    const publicUrl = `/uploads/${tenantId}/${uniqueFilename}`;

    // Save to database
    await db.insert(media).values({
      id: crypto.randomUUID(),
      tenantId,
      url: publicUrl,
      filename: originalName,
      mimeType: response.headers.get("content-type"),
      sizeBytes: buffer.length,
      altText: findMeta(item["wp:postmeta"], "_wp_attachment_image_alt") || item.title,
      caption: item.description, // WordPress use description for caption sometimes
    });

    return publicUrl;
  } catch (err) {
    console.error(`[downloadAndSaveMedia] Failed for ${remoteUrl}:`, err);
    return null;
  }
}

/**
 * Maps WordPress categories and tags to Jala Warta
 */
async function processTaxonomies(postId: string, tenantId: string, categoriesData: any) {
  if (!categoriesData) return;
  const cats = Array.isArray(categoriesData) ? categoriesData : [categoriesData];

  for (const cat of cats) {
    const domain = cat["@_domain"];
    const name = cat["#text"];
    const slug = cat["@_nicename"];

    if (domain === "category") {
      let [existing] = await db.select().from(categories).where(and(eq(categories.slug, slug), eq(categories.tenantId, tenantId))).limit(1);
      if (!existing) {
        const id = crypto.randomUUID();
        await db.insert(categories).values({ id, tenantId, name, slug });
        existing = { id, tenantId, name, slug, description: null, createdAt: new Date() };
      }
      await db.insert(postCategories).values({ postId, categoryId: existing.id }).onConflictDoNothing();
    } else if (domain === "post_tag") {
      let [existing] = await db.select().from(tags).where(and(eq(tags.slug, slug), eq(tags.tenantId, tenantId))).limit(1);
      if (!existing) {
        const id = crypto.randomUUID();
        await db.insert(tags).values({ id, tenantId, name, slug });
        existing = { id, tenantId, name, slug, createdAt: new Date() };
      }
      await db.insert(postTags).values({ postId, tagId: existing.id }).onConflictDoNothing();
    }
  }
}

function findMeta(meta: any, key: string): string | null {
  if (!meta) return null;
  const metaArray = Array.isArray(meta) ? meta : [meta];
  const found = metaArray.find((m: any) => m["wp:meta_key"] === key);
  return found ? found["wp:meta_value"] : null;
}

function autoSlug(val: string) {
  return val?.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "").slice(0, 100) || crypto.randomUUID().slice(0, 8);
}
