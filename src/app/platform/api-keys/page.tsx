import { db } from "@/db";
import { apiCredentials } from "@/db/schema";
import { maskApiKey, decryptAPIKey } from "@/lib/encryption";
import ApiKeysClient from "@/components/platform/ApiKeysClient";
import { desc } from "drizzle-orm";
import { API_CATEGORIES } from "@/lib/api-categories";

export const dynamic = "force-dynamic";

export default async function PlatformApiKeysPage() {
  const allCreds = await db.query.apiCredentials.findMany({
    orderBy: [desc(apiCredentials.createdAt)],
  });

  // Siapkan data untuk UI: dekripsi hanya untuk masking, tidak expose plaintext
  const maskedCreds = allCreds.map((cred) => {
    const plainKey = decryptAPIKey(cred.apiKey);
    return {
      ...cred,
      maskedKey: plainKey ? maskApiKey(plainKey) : "••••• (decryption error)",
      // Jangan pernah kirim plaintext ke client!
    };
  });

  return <ApiKeysClient credentials={maskedCreds} categories={API_CATEGORIES} />;
}
