<?php
// === CONFIG ===
// БАЗОВЫЙ PUBLISН CSV без gid:
$BASE_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFwid6J3ll7wtKVcTsESASvBT7Nvd8Kz1iMiWvACFEvNJ52R8CXWc4sirxzNLv2MbwWJ9z9IoQhoPV/pub?output=csv';

// Читаем gid из query (по умолчанию 0 — как было):
$gid = isset($_GET['gid']) ? preg_replace('/\D/', '', $_GET['gid']) : '0';
$CSV_URL = $BASE_CSV . '&gid=' . $gid;

// Раздельный кэш на каждый лист:
$CACHE_FILE = __DIR__ . '/cache_menu_' . $gid . '.json';
$TTL_SEC    = 300; // 5 минут
// === /CONFIG ===

// Без лишних предупреждений в вывод
ini_set('display_errors', '0');
error_reporting(0);

function respond_json($data, $code = 200){
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
function fetch_remote($url){
  // cURL сначала
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_CONNECTTIMEOUT => 10,
      CURLOPT_TIMEOUT => 20,
      CURLOPT_USERAGENT => 'VivienMenuBot/1.0',
      CURLOPT_SSL_VERIFYPEER => true,
      CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    $body = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body !== false && $http >= 200 && $http < 300) return $body;
  }
  // запасной вариант
  if (ini_get('allow_url_fopen')) {
    $ctx = stream_context_create(['http'=>['timeout'=>20,'user_agent'=>'VivienMenuBot/1.0']]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body !== false) return $body;
  }
  return false;
}

// Кэш?
if (file_exists($CACHE_FILE) && (time() - filemtime($CACHE_FILE) < $TTL_SEC)) {
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  readfile($CACHE_FILE);
  exit;
}

// Тянем CSV
$csv = fetch_remote($CSV_URL);

// Отладка (посмотреть прямо в браузере /api/menu_api.php?debug=1)
if (isset($_GET['debug'])) {
  header('Content-Type: text/plain; charset=utf-8');
  echo "allow_url_fopen=".(ini_get('allow_url_fopen')?'On':'Off')."\n";
  echo "csv_len=".($csv===false ? 'false' : strlen($csv))."\n\n";
  echo ($csv===false ? '[NO DATA]' : mb_substr($csv,0,500));
  exit;
}

if ($csv === false) {
  if (file_exists($CACHE_FILE)) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    readfile($CACHE_FILE);
    exit;
  }
  respond_json(['error'=>'Failed to fetch CSV'], 502);
}

// Парсинг CSV
$lines = preg_split('/\r\n|\r|\n/', trim($csv));
if (!$lines || count($lines) < 2) respond_json(['error'=>'CSV empty'], 500);

$delimiter = (substr_count($lines[0], ',') >= substr_count($lines[0], ';')) ? ',' : ';';
$headers = array_map('trim', str_getcsv($lines[0], $delimiter));

$rows = [];
for ($i=1; $i<count($lines); $i++){
  if ($lines[$i] === '') continue;
  $parts = str_getcsv($lines[$i], $delimiter);
  while (count($parts) < count($headers)) $parts[] = '';
  $row = [];
  foreach ($headers as $idx=>$h) $row[$h] = isset($parts[$idx]) ? trim($parts[$idx]) : '';
  $rows[] = $row;
}

// Нормализация
$items = [];
foreach ($rows as $r){
  $active = strtolower(trim($r['Active'] ?? '')) === 'yes';
  if (!$active) continue;
  $items[] = [
    'no'     => intval($r['No'] ?? 0),
    'filter' => $r['Filter'] ?? '',
    'price'  => $r['Price formatted'] ?? '',
    'names'  => [
      'lv' => $r['Name LV'] ?? '',
      'en' => $r['Name EN'] ?? '',
      'ru' => $r['Name RU'] ?? '',
      'fr' => $r['Name FR'] ?? '',
    ],
        // >>> ДОБАВЛЕНО: описания
    'descriptions' => [
      'lv' => $r['Description LV'] ?? '',
      'en' => $r['Description EN'] ?? '',
      'ru' => $r['Description RU'] ?? '',
      'fr' => $r['Description FR'] ?? '',
    ],
    // <<<
    'internal_name' => $r['Name'] ?? '',
  ];
}
usort($items, fn($a,$b)=> $a['no'] <=> $b['no']);

$payload = ['updated_at'=>gmdate('c'), 'count'=>count($items), 'items'=>$items];
@file_put_contents($CACHE_FILE, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
respond_json($payload);
