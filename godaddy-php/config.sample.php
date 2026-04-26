<?php

/**
 * Manual copy to `config.php` on the server if you do not use `.env` + deploy script.
 * Prefer: root `.env` + `scripts/deploy-godaddy-php.ps1` or GitHub Actions (generates config from secrets).
 */
return [
    'upload_secret' => 'CHANGE_ME_TO_A_LONG_RANDOM_STRING',

    // Must point to the physical `uploads/` folder (trailing slash). Files are stored as:
    // uploads/{codigo_incidencia}/report_*.jpg | closure_*.jpg
    'base_public_url' => 'https://example.com/incidencias-uploads/uploads/',

    'upload_dir' => __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR,

    'max_bytes' => 5 * 1024 * 1024,

    'allowed_extensions' => ['jpg', 'jpeg', 'png', 'webp'],
];
