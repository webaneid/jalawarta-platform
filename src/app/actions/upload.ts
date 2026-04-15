"use server";

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import { db } from "@/db";
import { media } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { processImageVariants } from "@/lib/media-processor";

export async function uploadMedia(formData: FormData, tenantId: string = "default") {
  try {
    const file = formData.get("file") as File;
    if (!file || file.size === 0) throw new Error("Tidak ada file yang dipilih.");

    // ── Security Guard ──────────────────────────────────────────
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Tipe file tidak diizinkan. Gunakan JPG, PNG, atau WEBP.");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Ukuran file melebihi batas 5MB.");
    }

    // Sanitasi nama file asli (hapus karakter berbahaya)
    const originalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const extension = originalName.split(".").pop()?.toLowerCase() || "jpg";

    // ── Simpan ke Disk ───────────────────────────────────────────
    const uniqueFilename = `${crypto.randomUUID()}.${extension}`;
    const tenantDir = join(process.cwd(), "public", "uploads", tenantId);
    await mkdir(tenantDir, { recursive: true });
    
    const absolutePath = join(tenantDir, uniqueFilename);
    await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

    // ── Background Optimization ──────────────────────────────────
    // Tidak menggunakan await agar upload utama tetap cepat
    processImageVariants(absolutePath).catch(err => 
      console.error("[Upload] Gagal memicu optimasi:", err)
    );

    // ── URL Publik ───────────────────────────────────────────────
    const publicUrl = `/uploads/${tenantId}/${uniqueFilename}`;

    // ── Simpan ke Database ───────────────────────────────────────
    await db.insert(media).values({
      id: crypto.randomUUID(),
      tenantId,
      url: publicUrl,
      filename: originalName,
      mimeType: file.type,
      sizeBytes: file.size,
      altText: null,
    });

    revalidatePath("/");

    return { success: true, url: publicUrl, filename: originalName };
  } catch (err: any) {
    console.error("[uploadMedia] Error:", err);
    return { success: false, error: err.message || "Upload gagal." };
  }
}
