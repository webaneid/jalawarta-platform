"use server";

import { db } from "@/db";
import { packages, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function verifySuperAdmin() {
  const session = await getSession();
  if (!session?.email) throw new Error("Unauthorized");
  
  const user = await db.query.users.findFirst({
    where: eq(users.email, session.email)
  });
  
  if (!user || user.role !== "PLATFORM_ADMIN") {
    throw new Error("Forbidden: Requires Platform Admin");
  }
}

export async function savePackage(data: {
  id: string;
  name: string;
  description: string | null;
  price: number;
  maxUsers: number;
  maxPosts: number;
  maxStorageMB: number;
  aiCreditsLimit: number;
  aiImageCreditsLimit: number;
  allowedModules: string[];
  allowedAddons: string[];
  isActive: boolean;
}) {
  try {
    await verifySuperAdmin();
    
    // Transform flat limits to JSONB
    const limits = {
       maxUsers: data.maxUsers,
       maxPosts: data.maxPosts,
       maxStorage: data.maxStorageMB * 1024 * 1024, // convert MB to bytes
       aiCreditsLimit: data.aiCreditsLimit,
       aiImageCreditsLimit: data.aiImageCreditsLimit,
    };

    const features = {
       allowedModules: data.allowedModules,
       allowedAddons: data.allowedAddons,
    };
    
    // UPSERT semantic
    await db.insert(packages).values({
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      limits,
      features,
      isActive: data.isActive,
    }).onConflictDoUpdate({
      target: packages.id,
      set: {
        name: data.name,
        description: data.description || "",
        price: data.price,
        limits,
        features,
        isActive: data.isActive,
      }
    });

    revalidatePath("/platform/packages");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

