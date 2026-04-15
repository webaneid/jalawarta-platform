import { auth } from "@/auth";
import { hasCapability, Capability, Role } from "./capabilities";

/**
 * Mendapatkan data session saat ini (Server Side).
 */
export async function getSession() {
  return await auth();
}

/**
 * Guard untuk Server Actions.
 * Melempar error jika user tidak memiliki capability yang dibutuhkan.
 */
export async function ensureCapability(capability: Capability) {
  const session = await getSession();
  
  if (!session?.user) {
    throw new Error("Authentication required");
  }

  const userRole = (session.user as any).role as Role;
  
  if (!hasCapability(userRole, capability)) {
    throw new Error(`Permission denied: You need "${capability}" capability.`);
  }

  return session.user;
}

/**
 * Versi boolean untuk pengecekan di dalam komponen UI atau logic percabangan.
 */
export async function checkUserCapability(capability: Capability): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;
  
  const userRole = (session.user as any).role as Role;
  return hasCapability(userRole, capability);
}
