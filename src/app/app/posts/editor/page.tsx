import Link from "next/link";
import { db } from "@/db";
import { posts, postCategories, postTags, tenantPlugins, apiCredentials } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getTenantAddons } from "@/app/actions/addons";
import PostEditorClient from "@/components/PostEditorClient";
import { getCategories } from "@/app/actions/categories";
import { getTags } from "@/app/actions/tags";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { DEFAULT_MODELS, PROVIDERS_MODELS } from "@/lib/ai-generator/providers";

export default async function PostEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await getSession();
  if (!session || !session.tenantId) redirect("/login");
  const tenantId = session.tenantId;

  const { id } = await searchParams;
  let existingPost = null;
  let selectedCategoryIds: string[] = [];
  let selectedTagIds: string[] = [];

  if (id) {
    const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    existingPost = result[0] || null;
    const [cats, tgs] = await Promise.all([
      db.select().from(postCategories).where(eq(postCategories.postId, id)),
      db.select().from(postTags).where(eq(postTags.postId, id)),
    ]);
    selectedCategoryIds = cats.map((c) => c.categoryId);
    selectedTagIds = tgs.map((t) => t.tagId);
  }

  const [allCategories, allTags] = await Promise.all([
    getCategories(tenantId),
    getTags(tenantId),
  ]);
  // Cek apakah add-on AI Generator aktif dan diizinkan oleh paket untuk tenant ini
  const { addons } = await getTenantAddons(tenantId);
  const aiPlugin = addons?.find(a => a.id === "ai-article-generator");

  let aiConfig = null;
  if (aiPlugin?.status === "ACTIVE" && aiPlugin?.isAllowedByPackage) {
    const config = (aiPlugin.config || {}) as any;

    // Ambil provider yang BENAR-BENAR tersedia di API Key Vault Platform
    // Hanya provider dengan key aktif di kategori ai_text_generation yang ditampilkan
    const vaultProviders = await db
      .select({ provider: apiCredentials.provider })
      .from(apiCredentials)
      .where(and(
        eq(apiCredentials.category, "ai_text_generation"),
        eq(apiCredentials.isActive, true)
      ));

    const availableProviders = vaultProviders.map((r) => r.provider);

    // Jika tidak ada provider aktif di Vault, jangan tampilkan panel AI
    if (availableProviders.length > 0) {
      // Pastikan preferredProvider adalah salah satu yang tersedia
      const preferred = availableProviders.includes(config.preferredProvider)
        ? config.preferredProvider
        : availableProviders[0];

      aiConfig = {
        creditsLimit: config.aiCreditsLimit ?? 20,
        creditsLeft: Math.max(0, (config.aiCreditsLimit ?? 20) - (config.aiCreditsUsed ?? 0)),
        progressMessages: config.progressMessages ?? [
          "Thinking...", "Sensing the vibes...", "Brewing something spicy...",
          "Almost there, hold tight...", "Final polishing...",
        ],
        templates: config.templates ?? [],
        availableProviders,           // ← hanya dari Vault
        preferredProvider: preferred,
        preferredModel: (() => {
          const validModels = PROVIDERS_MODELS[preferred]?.models.map((m) => m.id) ?? [];
          const saved = config.preferredModel;
          return saved && validModels.includes(saved) ? saved : (DEFAULT_MODELS[preferred] ?? "gemini-2.5-flash");
        })(),
        defaultLanguage: config.defaultLanguage ?? "id",
        defaultTone: config.defaultTone ?? "professional",
      };
    }
  }

  return (
    <div className="pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/posts"
          className="text-sm text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {existingPost ? "Edit Berita" : "Tulis Berita Baru"}
        </h1>
      </div>

      <PostEditorClient
        tenantId={tenantId}
        existingId={existingPost?.id}
        defaultTitle={(existingPost?.title as any)?.id || ""}
        defaultSlug={existingPost?.slug || ""}
        defaultFeaturedImage={existingPost?.featuredImage || undefined}
        defaultContent={(() => {
          const raw = existingPost?.content as any;
          if (!raw) return undefined;
          // Valid Tiptap JSON — pass as-is
          if (raw.type === "doc") return raw;
          // { html: string } format from insights auto-generation
          if (typeof raw.html === "string") return raw.html as any;
          // Legacy multilingual format { id: htmlString, en: '' } — extract HTML string
          // Tiptap accepts HTML strings directly and will parse them correctly
          if (typeof raw.id === "string") return raw.id as any;
          return raw;
        })()}
        allCategories={allCategories}
        allTags={allTags}
        defaultCategoryIds={selectedCategoryIds}
        defaultTagIds={selectedTagIds}
        defaultSeoConfig={existingPost?.seoConfig || undefined}
        aiConfig={aiConfig}
      />
    </div>
  );
}
