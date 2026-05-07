import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';

export interface UploadResult {
  ok: boolean;
  url?: string;
  storagePath?: string;
  error?: string;
}

// ── Configuración de compresión ───────────────────────────────────────────────
// Límite de dimensión máxima (px). Imágenes más grandes se redimensionan.
const MAX_DIMENSION = 1920;
// Calidad JPEG/WebP de salida (0-100). 82 es un buen balance calidad/peso.
const JPEG_QUALITY  = 82;
// Tamaño máximo en bytes antes de aplicar compresión extra (2 MB).
const SIZE_THRESHOLD = 2 * 1024 * 1024;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Comprime y redimensiona una imagen antes de subirla.
   * - Convierte a JPEG para máxima compatibilidad y menor peso.
   * - Redimensiona si supera MAX_DIMENSION en cualquier eje.
   * - Aplica compresión progresiva.
   * - Si sharp falla (formato no soportado), devuelve el buffer original.
   */
  async compressImage(
    buffer: Buffer,
    mimeType: string,
    originalName: string,
  ): Promise<{ buffer: Buffer; mimeType: string; name: string }> {
    // Solo procesar imágenes raster conocidas
    const isImage = /^image\/(jpeg|jpg|png|webp|gif|bmp|tiff)$/i.test(mimeType);
    if (!isImage) {
      return { buffer, mimeType, name: originalName };
    }

    try {
      const originalSize = buffer.length;

      const pipeline = sharp(buffer, { failOn: 'none' })
        .rotate()                          // corregir orientación EXIF
        .resize({
          width:  MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit:    'inside',
          withoutEnlargement: true,        // no agrandar imágenes pequeñas
        })
        .jpeg({
          quality:     JPEG_QUALITY,
          progressive: true,               // JPEG progresivo (mejor para web)
          mozjpeg:     true,               // algoritmo mozjpeg (mejor compresión)
        });

      // Si la imagen ya es pequeña, aplicar calidad más alta
      const quality = originalSize < SIZE_THRESHOLD ? 90 : JPEG_QUALITY;
      const compressed = await pipeline
        .jpeg({ quality, progressive: true, mozjpeg: true })
        .toBuffer();

      const reduction = Math.round((1 - compressed.length / originalSize) * 100);
      this.logger.log(
        `Image compressed: ${originalName} ` +
        `${Math.round(originalSize / 1024)}KB → ${Math.round(compressed.length / 1024)}KB ` +
        `(${reduction > 0 ? '-' : '+'}${Math.abs(reduction)}%)`,
      );

      // Si la compresión aumentó el tamaño (raro pero posible con PNGs pequeños), usar original
      if (compressed.length >= originalSize) {
        return { buffer, mimeType, name: originalName };
      }

      // Cambiar extensión a .jpg
      const baseName = originalName.replace(/\.[^.]+$/, '');
      return {
        buffer:   compressed,
        mimeType: 'image/jpeg',
        name:     `${baseName}.jpg`,
      };
    } catch (err) {
      this.logger.warn(`Image compression failed for ${originalName}: ${String(err)} — using original`);
      return { buffer, mimeType, name: originalName };
    }
  }

  /**
   * Sube un archivo al bridge PHP de GoDaddy.
   * Comprime la imagen automáticamente antes de enviarla.
   * Si falla, retorna ok=false con el mensaje de error — NO lanza excepción.
   */
  async uploadToPhpBridge(params: {
    fileBuffer: Buffer;
    originalName: string;
    mimeType: string;
    inspectionCode: string;
    imageType: 'report' | 'closure';
  }): Promise<UploadResult> {
    const uploadUrl = this.config.get<string>('GODADDY_PHP_UPLOAD_URL');
    const secret    = this.config.get<string>('GODADDY_UPLOAD_SECRET');

    if (!uploadUrl || !secret) {
      return {
        ok: false,
        error: 'PHP bridge not configured (GODADDY_PHP_UPLOAD_URL / GODADDY_UPLOAD_SECRET missing)',
      };
    }

    // ── Comprimir imagen antes de subir ──────────────────────────────────────
    const { buffer, mimeType, name } = await this.compressImage(
      params.fileBuffer,
      params.mimeType,
      params.originalName,
    );

    try {
      const form = new FormData();
      const bytes = new Uint8Array(buffer);
      const blob  = new Blob([bytes], { type: mimeType });
      form.append('file', blob, name);
      form.append('codigo_inspeccion', params.inspectionCode);
      form.append('codigo_incidencia', params.inspectionCode); // compatibilidad PHP bridge
      form.append('tipo_imagen', params.imageType);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch(uploadUrl, {
        method:  'POST',
        headers: { 'X-Upload-Token': secret },
        body:    form,
        signal:  controller.signal,
      });

      clearTimeout(timeout);

      const json = (await response.json()) as {
        ok: boolean;
        url?: string;
        storage_path?: string;
        error?: string;
      };

      if (!json.ok) {
        this.logger.warn(`PHP bridge error for ${params.inspectionCode}: ${json.error}`);
        return { ok: false, error: json.error ?? 'Unknown PHP bridge error' };
      }

      return { ok: true, url: json.url, storagePath: json.storage_path };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`PHP bridge unreachable for ${params.inspectionCode}: ${msg}`);
      return { ok: false, error: `PHP bridge unreachable: ${msg}` };
    }
  }
}
