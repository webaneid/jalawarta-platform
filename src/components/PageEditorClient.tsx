"use client";

import { useTransition } from "react";
import UniversalEditor from "./editor/UniversalEditor";
import { savePage } from "@/app/actions/pages";
import { useRouter } from "next/navigation";
import PresenceIndicator from "./PresenceIndicator";

type PageEditorClientProps = {
  tenantId: string;
  existingId?: string;
  defaultTitle?: string;
  defaultSlug?: string;
  defaultFeaturedImage?: string;
  defaultContent?: object;
  defaultSeoConfig?: any;
};

export default function PageEditorClient({
  tenantId,
  existingId,
  defaultTitle = "",
  defaultSlug = "",
  defaultFeaturedImage,
  defaultContent,
  defaultSeoConfig,
}: PageEditorClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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
          const result = await savePage({
            tenantId,
            title: data.title,
            slug: data.slug,
            content: data.content,
            featuredImage: data.featuredImage || undefined,
            seoConfig: data.seoConfig,
            existingId,
          });

          if (result.success) {
            setTimeout(() => router.push("/pages"), 1200);
            return { success: true };
          } else {
            return { success: false, error: result.error };
          }
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      }}
    />
  );
}
