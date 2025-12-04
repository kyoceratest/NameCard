<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        exit;
    }

    // Support both JSON and form POST
    $contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
    $data = [];

    if (stripos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        if ($raw === false) {
            throw new Exception('Unable to read request body');
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            throw new Exception('Invalid JSON payload');
        }
    } else {
        $data = $_POST;
    }

    $firstName = isset($data['firstName']) ? trim($data['firstName']) : '';
    $lastName  = isset($data['lastName']) ? trim($data['lastName']) : '';
    $email     = isset($data['email']) ? trim($data['email']) : '';
    $mobile    = isset($data['mobile']) ? trim($data['mobile']) : '';
    $company   = isset($data['company']) ? trim($data['company']) : '';
    $source    = isset($data['source']) ? trim($data['source']) : '';

    if ($firstName === '' && $lastName === '' && $email === '' && $mobile === '') {
        throw new Exception('At least one of first name, last name, email or mobile is required');
    }

    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }

    $baseDir = realpath(__DIR__ . '/..' . DIRECTORY_SEPARATOR . '..'); // back to NameCard
    if ($baseDir === false) {
        throw new Exception('Invalid base directory');
    }

    $dataDir = $baseDir . DIRECTORY_SEPARATOR . 'data';
    if (!is_dir($dataDir)) {
        if (!mkdir($dataDir, 0777, true) && !is_dir($dataDir)) {
            throw new Exception('Unable to create data directory');
        }
    }

    $dbPath = $dataDir . DIRECTORY_SEPARATOR . 'crm.db';
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Create clients table if needed
    $pdo->exec('CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT,
        last_name  TEXT,
        company    TEXT,
        email      TEXT,
        mobile     TEXT,
        source     TEXT,
        created_at TEXT,
        updated_at TEXT
    )');

    $now = date('c');

    $stmt = $pdo->prepare('INSERT INTO clients (
            first_name, last_name, company, email, mobile, source, created_at, updated_at
        ) VALUES (
            :first_name, :last_name, :company, :email, :mobile, :source, :created_at, :updated_at
        )');

    $stmt->execute([
        ':first_name' => $firstName,
        ':last_name'  => $lastName,
        ':company'    => $company,
        ':email'      => $email,
        ':mobile'     => $mobile,
        ':source'     => $source,
        ':created_at' => $now,
        ':updated_at' => $now,
    ]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}
