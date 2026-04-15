"use server";

import { db } from "@/db";
import { comments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createComment(formData: FormData) {
  const tenantId = formData.get("tenantId") as string;
  const postId = formData.get("postId") as string;
  const authorId = formData.get("authorId") as string | null;
  const guestName = formData.get("guestName") as string | null;
  const guestEmail = formData.get("guestEmail") as string | null;
  const content = formData.get("content") as string;
  const parentId = formData.get("parentId") as string | null;

  if (!content || !tenantId || !postId) {
    throw new Error("Missing required fields");
  }

  // Auto-approve if author is logged in (staff)
  // Logic simple: jika authorId ada, status APPROVED (asumsi staff login)
  // Untuk guest, status PENDING
  const status = authorId ? "APPROVED" : "PENDING";

  await db.insert(comments).values({
    tenantId,
    postId,
    authorId,
    guestName,
    guestEmail,
    content,
    status,
    parentId,
  });

  revalidatePath(`/[domain]/post/[slug]`, "page");
}

export async function moderateComment(commentId: string, status: "APPROVED" | "SPAM" | "TRASH") {
  await db
    .update(comments)
    .set({ status })
    .where(eq(comments.id, commentId));

  revalidatePath(`/app/comments`, "page");
}
