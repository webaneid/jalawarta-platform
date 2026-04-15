/**
 * slugify — Mengubah string menjadi slug yang SEO-friendly.
 * Mendukung aksara Latin, Bahasa Indonesia, dan karakter Unicode.
 */
export function slugify(text: string, maxLength: number = 70): string {
  return text
    .toLowerCase()
    .normalize("NFD")                          // Pisahkan karakter beraksara
    .replace(/[\u0300-\u036f]/g, "")           // Hapus diakritik (é→e, ü→u, dll.)
    .replace(/[^a-z0-9\s-]/g, "")             // Hapus karakter non-alfanumerik
    .trim()
    .replace(/\s+/g, "-")                      // Spasi → tanda hubung
    .replace(/-+/g, "-")                       // Hapus tanda hubung berulang
    .substring(0, maxLength)                   // Potong jika terlalu panjang
    .replace(/-$/, "");                        // Hapus tanda hubung di akhir
}
