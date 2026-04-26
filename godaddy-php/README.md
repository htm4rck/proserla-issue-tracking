# PHP en GoDaddy — imágenes por código y tipo

El bridge vive en esta carpeta. **Rutas en disco y URL pública:**

```text
uploads/{codigo_incidencia}/report_{fecha}_{rand}.jpg   # evidencia de apertura / registro
uploads/{codigo_incidencia}/closure_{fecha}_{rand}.jpg  # evidencia de cierre
```

NestJS debe persistir en **`imagenes_incidencia`** (además de la URL) el **código de incidencia** y el **tipo** para consultas, reportes y borrado lógico.

## Contrato sugerido en PostgreSQL (`imagenes_incidencia`)

| Columna (ejemplo) | Tipo | Notas |
|-------------------|------|--------|
| `id` | uuid / serial | PK |
| `incidencia_id` | uuid FK | Opcional si el código aún no tiene fila en `incidencias` |
| `codigo_incidencia` | text | Mismo valor que envías al PHP; índice para listar archivos por caso |
| `tipo_imagen` | enum o text | `report` \| `closure` (alineado con la respuesta JSON del PHP) |
| `url_publica` | text | Campo `url` del JSON |
| `storage_path` | text | Campo `storage_path` (ej. `INC-2026-001/report_20260424_...jpg`) |
| `bytes` | int | Opcional |
| `mime` | text | Opcional |
| `creado_en` | timestamptz | |

El Angular/Nest **no** debe enviar el token al PHP desde el navegador: idealmente **NestJS** recibe el multipart, reenvía al PHP (o el cliente sube vía endpoint Nest que añade `codigo_incidencia` y `tipo_imagen`).

## POST `upload.php`

**Multipart**

| Campo | Obligatorio | Descripción |
|--------|-------------|-------------|
| `file` | sí | Imagen |
| `codigo_incidencia` | sí | Código de negocio (solo `A-Za-z0-9._-`, máx. 96 caracteres). Alias: `codigo` |
| `tipo_imagen` | sí | `report` o `closure`. Alias en español: `incidencia`/`apertura` → report; `cierre` → closure |

**Cabecera:** `X-Upload-Token: <GODADDY_UPLOAD_SECRET>` (o POST `token`).

**Respuesta OK (200)**

```json
{
  "ok": true,
  "url": "https://tu-dominio/.../uploads/INC-2026-042/report_20260424_153045_a1b2c3d4.jpg",
  "codigo_incidencia": "INC-2026-042",
  "tipo_imagen": "report",
  "storage_path": "INC-2026-042/report_20260424_153045_a1b2c3d4.jpg",
  "filename": "report_20260424_153045_a1b2c3d4.jpg",
  "bytes": 12345,
  "mime": "image/jpeg"
}
```

## Configuración

1. **Raíz del repo:** copia [`.env.example`](../.env.example) a `.env` y completa FTP + `GODADDY_PHP_PUBLIC_BASE_URL` + `GODADDY_UPLOAD_SECRET`.
2. **Generación de `config.php`:** a partir de [`config.deploy.php.template`](./config.deploy.php.template) (placeholders base64; evita problemas con comillas en el secreto).
3. **Manual (sin script):** sigue usando `config.sample.php` → renombrar a `config.php` en el servidor y editar a mano.

## Despliegue

### Desde tu máquina (PowerShell)

En la raíz del repo:

```powershell
pwsh ./scripts/deploy-godaddy-php.ps1
```

Genera `godaddy-php/config.php` y sube por FTP/FTPS: `upload.php`, `.htaccess`, `uploads/.htaccess`, `config.php`.

### Desde GitHub Actions

Workflow [`.github/workflows/deploy-godaddy-php.yml`](../.github/workflows/deploy-godaddy-php.yml): genera `config.php` con secretos del repositorio y usa **FTP-Deploy-Action** (`protocol: ftps`). Ajusta el YAML a `ftp` si tu plan no soporta FTPS.

**Secretos:** `GODADDY_FTP_HOST`, `GODADDY_FTP_USER`, `GODADDY_FTP_PASSWORD`, `GODADDY_FTP_REMOTE_PATH`, `GODADDY_UPLOAD_SECRET`, `GODADDY_PHP_PUBLIC_BASE_URL`.

El workflow **no** borra carpetas de incidencias que solo existen en el servidor (`dangerous-clean-slate: false`).

## Seguridad

- `config.php` no se versiona; `.htaccess` bloquea acceso HTTP directo al fichero.
- `uploads/.htaccess` impide ejecutar PHP dentro de las carpetas de imágenes.
- Ajusta CORS en `upload.php` a tu dominio Angular cuando lo definas.
