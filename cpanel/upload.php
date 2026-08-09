<?php
/**
 * KoboAds media upload endpoint.
 *
 * Deploy this file to your cPanel hosting, e.g.:
 *   public_html/api/upload.php
 *
 * It must be reachable at the URL you put in EXPO_PUBLIC_CPANEL_UPLOAD_URL (.env).
 * It saves the uploaded file next to itself in an /uploads folder and returns the
 * public URL as JSON: { "url": "https://koboads.com/api/uploads/xxxx.jpg" }
 *
 * SETUP:
 * 1. Upload this file and the empty `uploads/` folder to your cPanel (e.g. via File
 *    Manager or FTP) at public_html/api/upload.php and public_html/api/uploads/.
 * 2. chmod the uploads/ folder to 755 (writable by the web server).
 * 3. Set $UPLOAD_TOKEN below to a long random string, and put the SAME value in
 *    EXPO_PUBLIC_CPANEL_UPLOAD_TOKEN in the app's .env — this is the only thing
 *    stopping a stranger from uploading to your hosting, so don't skip it.
 * 4. Set $ALLOWED_ORIGIN to your app's web origin if you serve the Expo web build
 *    from a different domain (leave as '*' if you only call this from the mobile app).
 */

// ---- Configuration ---------------------------------------------------------
$UPLOAD_TOKEN = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING';
$ALLOWED_ORIGIN = '*';
$MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB, matches the app's "Max 20MB" copy
$ALLOWED_MIME_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'video/mp4' => 'mp4',
];
$UPLOAD_DIR = __DIR__ . '/uploads/';
// -----------------------------------------------------------------------------

header('Access-Control-Allow-Origin: ' . $ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Upload-Token');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function fail($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail('Only POST is allowed.', 405);
}

// --- Auth ---
$token = $_SERVER['HTTP_X_UPLOAD_TOKEN'] ?? '';
if ($UPLOAD_TOKEN === 'CHANGE_ME_TO_A_LONG_RANDOM_STRING' || $token !== $UPLOAD_TOKEN) {
    fail('Unauthorized.', 401);
}

if (!isset($_FILES['file'])) {
    fail('No file field named "file" was found in the request.');
}

$file = $_FILES['file'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    fail('Upload error code: ' . $file['error']);
}

if ($file['size'] > $MAX_FILE_SIZE_BYTES) {
    fail('File is larger than 20MB.');
}

// Verify the actual file content, not just the client-supplied MIME type.
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$actualMime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!array_key_exists($actualMime, $ALLOWED_MIME_TYPES)) {
    fail('Unsupported file type: ' . $actualMime . '. Allowed: JPG, PNG, WEBP, MP4.');
}

if (!is_dir($UPLOAD_DIR)) {
    mkdir($UPLOAD_DIR, 0755, true);
}

$extension = $ALLOWED_MIME_TYPES[$actualMime];
$filename = bin2hex(random_bytes(16)) . '.' . $extension;
$destination = $UPLOAD_DIR . $filename;

if (!move_uploaded_file($file['tmp_name'], $destination)) {
    fail('Could not save the uploaded file.', 500);
}

$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$path = str_replace($_SERVER['DOCUMENT_ROOT'], '', $destination);
$path = str_replace('\\', '/', $path); // Windows-hosted cPanel safety
$publicUrl = $protocol . '://' . $host . $path;

echo json_encode([
    'url' => $publicUrl,
    'mimeType' => $actualMime,
    'sizeBytes' => $file['size'],
]);
