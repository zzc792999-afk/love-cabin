<?php
// ==========================================
// PHP 兼容留言数据持久化 API (other/api.php)
// ==========================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$dataFile = __DIR__ . '/messages.json';

// 初始化并保证留言文件有默认数据
function ensureDataFile($file) {
    if (!file_exists($file)) {
        $defaultNotes = [
            [
                "id" => round(microtime(true) * 1000) - 10000,
                "text" => "珊珊宝贝，我们和好啦！希望以后有矛盾我们要及时沟通，永远不分开好不好！mua~~",
                "color" => "pink",
                "emoji" => "💖",
                "x" => 30,
                "y" => 40,
                "date" => "2026/01/18",
                "author" => "陈祖哲"
            ],
            [
                "id" => round(microtime(true) * 1000) - 5000,
                "text" => "替陈祖哲监督白珊珊宝贝：今天也要开开心心，好好吃饭，好好想他哦！",
                "color" => "yellow",
                "emoji" => "🐾",
                "x" => 230,
                "y" => 150,
                "date" => "2026/02/06",
                "author" => "恋爱守护精灵"
            ]
        ];
        file_put_contents($file, json_encode($defaultNotes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
}

ensureDataFile($dataFile);
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // 读取留言列表
    $data = file_get_contents($dataFile);
    if ($data === false) {
        http_response_code(500);
        echo json_encode(["error" => "读取留言数据失败"]);
    } else {
        echo $data;
    }
    exit;
}

if ($method === 'POST') {
    // 写入新留言
    $input = file_get_contents('php://input');
    $newNote = json_decode($input, true);
    
    if (!$newNote) {
        http_response_code(400);
        echo json_encode(["error" => "无效的 JSON 数据格式"]);
        exit;
    }
    
    $data = file_get_contents($dataFile);
    $notes = json_decode($data, true);
    if (!is_array($notes)) {
        $notes = [];
    }
    
    $notes[] = $newNote;
    $result = file_put_contents($dataFile, json_encode($notes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    if ($result === false) {
        http_response_code(500);
        echo json_encode(["error" => "写入留言数据失败"]);
    } else {
        echo json_encode(["success" => true, "note" => $newNote]);
    }
    exit;
}

if ($method === 'DELETE') {
    // 删除留言
    $idToDelete = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if ($idToDelete <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "无效的 ID"]);
        exit;
    }
    
    $data = file_get_contents($dataFile);
    $notes = json_decode($data, true);
    if (!is_array($notes)) {
        $notes = [];
    }
    
    $filteredNotes = [];
    foreach ($notes as $note) {
        if (isset($note['id']) && intval($note['id']) !== $idToDelete) {
            $filteredNotes[] = $note;
        }
    }
    
    $result = file_put_contents($dataFile, json_encode($filteredNotes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    if ($result === false) {
        http_response_code(500);
        echo json_encode(["error" => "删除留言失败"]);
    } else {
        echo json_encode(["success" => true]);
    }
    exit;
}

http_response_code(405);
echo json_encode(["error" => "不支持的请求方法"]);
