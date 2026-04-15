"use client";

import { useState } from "react";
import UniversalEditor from "./editor/UniversalEditor";
import { savePost } from "@/app/actions/cms";
import { syncPostCategories } from "@/app/actions/categories";
import { syncPostTags, bulkSyncPostTags } from "@/app/actions/tags";
import { useRouter } from "next/navigation";
import TagInput, { TagItem } from "./TagInput";
import PresenceIndicator from "./PresenceIndicator";
import AiContentPanel from "@/components/addons/ai-generator/AiContentPanel";

type Category = { id: string; name: string; slug: string };
type Tag = { id: string; name: string; slug: string };

type PostEditorClientProps = {
  tenantId: string;
  existingId?: string;
  defaultTitle?: string;
  defaultSlug?: string;
  defaultFeaturedImage?: string;
  defaultContent?: object;
  allCategories?: Category[];
  allTags?: Tag[];
  defaultCategoryIds?: string[];
  defaultTagIds?: string[];
  defaultSeoConfig?: any;
  aiConfig?: {
    creditsLimit: number;
    creditsLeft: number;
    progressMessages: string[];
    templates: any[];
    availableProviders: string[];
    preferredProvider: string;
    preferredModel: string;
    defaultLanguage: string;
    defaultTone: string;
  } | null;
};

export default function PostEditorClient({
  tenantId,
  existingId,
  defaultTitle = "",
  defaultSlug = "",
  defaultFeaturedImage,
  defaultContent,
  allCategories = [],
  allTags = [],
  defaultCategoryIds = [],
  defaultTagIds = [],
  defaultSeoConfig,
  aiConfig,
}: PostEditorClientProps) {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(defaultCategoryIds);
  const [selectedTags, setSelectedTags] = useState<TagItem[]>(() => {
    return defaultTagIds
      .map((tid) => {
        const found = allTags.find((t) => t.id === tid);
        return found ? { id: found.id, name: found.name } : null;
      })
      .filter((t): t is TagItem => t !== null);
  });

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  return (
    <UniversalEditor
      tenantId={tenantId}
      defaultTitle={defaultTitle}
      defaultSlug={defaultSlug}
      defaultFeaturedImage={defaultFeaturedImage}
      defaultContent={defaultContent}
      defaultSeoConfig={defaultSeoConfig}
      topRightControls={existingId ? <PresenceIndicator postId={existingId} tenantId={tenantId} /> : undefined}
      onSave={async (data, status) => {
        try {
          const result = await savePost({
            tenantId,
            title: data.title,
            slug: data.slug,
            content: data.content,
            featuredImage: data.featuredImage || undefined,
            status,
            seoConfig: data.seoConfig,
            existingId,
          });

          if (result.success && result.id) {
            await Promise.all([
              syncPostCategories(result.id, selectedCategories),
              bulkSyncPostTags(result.id, tenantId, selectedTags),
            ]);
            setTimeout(() => router.push("/posts"), 1200);
            return { success: true };
          } else if (result.success) {
            setTimeout(() => router.push("/posts"), 1200);
            return { success: true };
          } else {
            return { success: false, error: result.error };
          }
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      }}
      sidebarPanels={
        <>
          {/* ===== Panel Kategori ===== */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden mt-4">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategori</h3>
              {selectedCategories.length > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold">{selectedCategories.length}</span>
              )}
            </div>
            <div className="p-4">
              {allCategories.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">
                  Belum ada kategori.{" "}
                  <a href="/categories" className="text-blue-600 hover:underline">Tambahkan →</a>
                </p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {allCategories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="w-4 h-4 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">{cat.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ===== Panel Tag ===== */}
          <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden mt-4">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tag</h3>
              {selectedTags.length > 0 && (
                <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">{selectedTags.length}</span>
              )}
            </div>
            <div className="p-4">
              <TagInput
                allTags={allTags}
                selectedTags={selectedTags}
                onChange={setSelectedTags}
              />
            </div>
          </div>

          {/* ===== Panel AI Generator (hanya jika add-on aktif) ===== */}
          {aiConfig && (
            <div className="mt-4">
              <AiContentPanel
                initialConfig={aiConfig}
                onInsertToEditor={(markdownText) => {
                  // Trigger event ke UniversalEditor untuk insert konten
                  window.dispatchEvent(new CustomEvent("ai:insert-content", { detail: { markdown: markdownText } }));
                }}
              />
            </div>
          )}
        </>
      }
    />
  );
}

