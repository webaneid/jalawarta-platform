import { getSession as getCustomSession } from "@/lib/session";

/**
 * Unifikasi Autentikasi:
 * Mengalihkan fungsi auth() agar membaca dari sistem sesi kustom (jw_session).
 * Ini memastikan konsistensi antara Proxy, Dashboard, dan Server Actions.
 */
export const auth = async () => {
  const session = await getCustomSession();
  if (!session) return null;

  return {
    user: {
      id: session.userId,
      name: session.name,
      email: session.email,
      tenantId: session.tenantId,
      subdomain: session.subdomain,
      role: session.role || "SUBSCRIBER",
      // Tambahkan properti lain yang dibutuhkan oleh layout/komponen
      displayName: session.name, 
    },
    expires: session.expiresAt,
  };
};

/**
 * Mock handlers untuk NextAuth API route agar tidak error saat diimpor,
 * meskipun sekarang kita menggunakan custom login action.
 */
export const handlers = {
  GET: () => new Response("NextAuth is disabled in favor of Custom Session", { status: 404 }),
  POST: () => new Response("NextAuth is disabled in favor of Custom Session", { status: 404 }),
};

// NextAuthOptions dummy untuk tipe data jika dibutuhkan di tempat lain
export const authOptions = {};
