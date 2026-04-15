import sharp from "sharp";
import { join, dirname, basename, extname } from "path";

/**
 * Memproses gambar yang baru diunggah untuk membuat varian WebP dan AVIF.
 * Dijalankan secara asinkron ("background") untuk tidak menghambar upload utama.
 */
export async function processImageVariants(filePath: string) {
  try {
    const dir = dirname(filePath);
    const fileName = basename(filePath, extname(filePath));

    const webpPath = join(dir, `${fileName}.webp`);
    const avifPath = join(dir, `${fileName}.avif`);

    // Generate WebP
    await sharp(filePath)
      .webp({ quality: 80 })
      .toFile(webpPath);

    // Generate AVIF
    await sharp(filePath)
      .avif({ quality: 65 })
      .toFile(avifPath);

    console.log(`[MediaProcessor] Sukses membuat varian untuk: ${fileName}`);
    
    return {
      webp: webpPath,
      avif: avifPath
    };
  } catch (err) {
    console.error("[MediaProcessor] Error saat memproses varian:", err);
    return null;
  }
}
