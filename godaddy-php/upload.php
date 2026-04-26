<?php

/**
 * GoDaddy bridge: stores incident images under uploads/{codigo_incidencia}/ with a type prefix.
 * NestJS should persist the JSON fields in imagenes_incidencia (codigo + tipo + url + path).
 *
 * POST multipart:
 *   - file: image (required)
 *   - codigo_incidencia: business code, e.g. INC-2026-042 (required)
 *   - tipo_imagen: report | closure (required). Aliases: incidencia|initial -> report; cierre|close -> closure
 *
 * Auth: X-Upload-Token or POST token = upload_secret from config.php
 *
 * Success: { ok, url, codigo_incidencia, tipo_imagen, storage_path, filename, bytes, mime }
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Upload-Token');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$configPath = __DIR__ . DIRECTORY_SEPARATOR . 'config.php';
if (!is_readable($configPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server not configured (missing config.php)'], JSON_UNESCAPED_UNICODE);
    exit;
}

/** @var array<string, mixed> $cfg */
$cfg = require $configPath;
$secret = (string) ($cfg['upload_secret'] ?? '');
$baseUrl = rtrim((string) ($cfg['base_public_url'] ?? ''), '/') . '/';
$uploadRoot = (string) ($cfg['upload_dir'] ?? '');
$maxBytes = (int) ($cfg['max_bytes'] ?? 5 * 1024 * 1024);
$allowedExt = $cfg['allowed_extensions'] ?? ['jpg', 'jpeg', 'png', 'webp'];
if (!is_array($allowedExt)) {
    $allowedExt = ['jpg', 'jpeg', 'png', 'webp'];
}
$allowedExt = array_map(static fn ($e) => strtolower((string) $e), $allowedExt);

$token = $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? ($_POST['token'] ?? '');
if ($secret === '' || !hash_equals($secret, (string) $token)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized'], JSON_UNESCAPED_UNICODE);
    exit;
}

$rawCodigo = (string) ($_POST['codigo_incidencia'] ?? $_POST['codigo'] ?? '');
$codigo = sanitize_codigo_incidencia($rawCodigo);
if ($codigo === null) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid or missing codigo_incidencia'], JSON_UNESCAPED_UNICODE);
    exit;
}

$tipoRaw = strtolower(trim((string) ($_POST['tipo_imagen'] ?? $_POST['kind'] ?? '')));
$tipoMap = [
    'report' => 'report',
    'incidencia' => 'report',
    'initial' => 'report',
    'apertura' => 'report',
    'closure' => 'closure',
    'cierre' => 'closure',
    'close' => 'closure',
    'cierre_incidencia' => 'closure',
];
if ($tipoRaw === '' || !isset($tipoMap[$tipoRaw])) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => 'Invalid or missing tipo_imagen (use report|closure or incidencia|cierre)',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
$tipoImagen = $tipoMap[$tipoRaw];

if ($uploadRoot === '' || !is_dir($uploadRoot) || !is_writable($uploadRoot)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Upload root not writable'], JSON_UNESCAPED_UNICODE);
    exit;
}

$incidentDir = $uploadRoot . $codigo . DIRECTORY_SEPARATOR;
if (!is_dir($incidentDir) && !@mkdir($incidentDir, 0755, true)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Could not create incident directory'], JSON_UNESCAPED_UNICODE);
    exit;
}

$fileKey = null;
if (!empty($_FILES['file']) && is_array($_FILES['file'])) {
    $fileKey = 'file';
} else {
    foreach ($_FILES as $k => $v) {
        if (is_array($v) && isset($v['error']) && (int) $v['error'] !== UPLOAD_ERR_NO_FILE) {
            $fileKey = (string) $k;
            break;
        }
    }
}

if ($fileKey === null) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'No file field (use multipart name "file")'], JSON_UNESCAPED_UNICODE);
    exit;
}

$f = $_FILES[$fileKey];
if (!is_array($f) || !isset($f['error'], $f['tmp_name'], $f['size'], $f['name'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid upload'], JSON_UNESCAPED_UNICODE);
    exit;
}

$err = (int) $f['error'];
if ($err !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Upload failed (code ' . $err . ')'], JSON_UNESCAPED_UNICODE);
    exit;
}

$size = (int) $f['size'];
if ($size <= 0 || $size > $maxBytes) {
    http_response_code(413);
    echo json_encode(['ok' => false, 'error' => 'File too large'], JSON_UNESCAPED_UNICODE);
    exit;
}

$origName = (string) $f['name'];
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
if ($ext === 'jpeg') {
    $ext = 'jpg';
}
if (!in_array($ext, $allowedExt, true)) {
    http_response_code(415);
    echo json_encode(['ok' => false, 'error' => 'Extension not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file((string) $f['tmp_name']) ?: '';
$allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
];
if (!in_array($mime, $allowedMimes, true)) {
    http_response_code(415);
    echo json_encode(['ok' => false, 'error' => 'MIME type not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$safeExt = $ext === 'jpeg' ? 'jpg' : $ext;
$prefix = $tipoImagen === 'closure' ? 'closure' : 'report';
$newName = $prefix . '_' . gmdate('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $safeExt;
$destPath = $incidentDir . $newName;

if (!move_uploaded_file((string) $f['tmp_name'], $destPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Could not store file'], JSON_UNESCAPED_UNICODE);
    exit;
}

@chmod($destPath, 0644);

$relativePath = $codigo . '/' . $newName;
$publicUrl = $baseUrl . str_replace('\\', '/', $relativePath);

echo json_encode([
    'ok' => true,
    'url' => $publicUrl,
    'codigo_incidencia' => $codigo,
    'tipo_imagen' => $tipoImagen,
    'storage_path' => $relativePath,
    'filename' => $newName,
    'bytes' => $size,
    'mime' => $mime,
], JSON_UNESCAPED_UNICODE);

/**
 * @return non-empty-string|null
 */
function sanitize_codigo_incidencia(string $raw): ?string
{
    $s = trim($raw);
    if ($s === '' || strlen($s) > 96) {
        return null;
    }
    if (!preg_match('/^[A-Za-z0-9._-]+$/', $s)) {
        return null;
    }

    return $s;
}
