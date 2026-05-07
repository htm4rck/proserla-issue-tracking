import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UploadResult {
  ok: boolean;
  url?: string;
  storagePath?: string;
  error?: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Sube un archivo al bridge PHP de GoDaddy usando fetch nativo (Node 18+).
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
    const secret = this.config.get<string>('GODADDY_UPLOAD_SECRET');

    if (!uploadUrl || !secret) {
      return {
        ok: false,
        error: 'PHP bridge not configured (GODADDY_PHP_UPLOAD_URL / GODADDY_UPLOAD_SECRET missing)',
      };
    }

    try {
      const form = new FormData();
      const bytes = new Uint8Array(params.fileBuffer);
      const blob = new Blob([bytes], { type: params.mimeType });
      form.append('file', blob, params.originalName);
      form.append('codigo_inspeccion', params.inspectionCode);
      form.append('tipo_imagen', params.imageType);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'X-Upload-Token': secret },
        body: form,
        signal: controller.signal,
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
