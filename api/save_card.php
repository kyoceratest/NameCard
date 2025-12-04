<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');

try {
    $raw = file_get_contents('php://input');
    if ($raw === false) {
        throw new Exception('Unable to read request body');
    }

    $data = json_decode($raw, true);
    if (!is_array($data)) {
        throw new Exception('Invalid JSON payload');
    }

    $sessionId = isset($data['sessionId']) ? trim($data['sessionId']) : '';
    if ($sessionId === '') {
        throw new Exception('Missing sessionId');
    }

    $firstName = isset($data['firstName']) ? trim($data['firstName']) : '';
    $lastName  = isset($data['lastName']) ? trim($data['lastName']) : '';
    $mobile    = isset($data['mobile']) ? trim($data['mobile']) : '';
    $office    = isset($data['office']) ? trim($data['office']) : '';
    $company   = isset($data['company']) ? trim($data['company']) : '';
    $email     = isset($data['email']) ? trim($data['email']) : '';
    $address   = isset($data['address']) ? trim($data['address']) : '';
    $updatedAt = date('c');

    // Basic server-side validation mirroring client rules
    if ($firstName === '' && $lastName === '' && $mobile === '' && $office === '' && $email === '' && $address === '' && $company === '') {
        echo json_encode(['success' => false, 'message' => 'Empty payload; nothing to save']);
        exit;
    }

    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format');
    }

    $baseDir = realpath(__DIR__ . '/..');
    if ($baseDir === false) {
        throw new Exception('Invalid base directory');
    }

    $dataDir = $baseDir . DIRECTORY_SEPARATOR . 'data';
    if (!is_dir($dataDir)) {
        if (!mkdir($dataDir, 0777, true) && !is_dir($dataDir)) {
            throw new Exception('Unable to create data directory');
        }
    }

    $dbPath = $dataDir . DIRECTORY_SEPARATOR . 'namecard.db';
    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $pdo->exec('CREATE TABLE IF NOT EXISTS cards (
        session_id TEXT PRIMARY KEY,
        first_name TEXT,
        last_name  TEXT,
        mobile     TEXT,
        office     TEXT,
        company    TEXT,
        email      TEXT,
        address    TEXT,
        updated_at TEXT
    )');

    // Safe migration: ensure company column exists even if table was created before it was added
    $columnsStmt = $pdo->query("PRAGMA table_info(cards)");
    $hasCompany = false;
    foreach ($columnsStmt as $col) {
        if (isset($col['name']) && $col['name'] === 'company') {
            $hasCompany = true;
            break;
        }
    }
    if (!$hasCompany) {
        $pdo->exec('ALTER TABLE cards ADD COLUMN company TEXT');
    }

    $stmt = $pdo->prepare('INSERT INTO cards (
            session_id, first_name, last_name, mobile, office, company, email, address, updated_at
        ) VALUES (
            :session_id, :first_name, :last_name, :mobile, :office, :company, :email, :address, :updated_at
        ) ON CONFLICT(session_id) DO UPDATE SET
            first_name = excluded.first_name,
            last_name  = excluded.last_name,
            mobile     = excluded.mobile,
            office     = excluded.office,
            company    = excluded.company,
            email      = excluded.email,
            address    = excluded.address,
            updated_at = excluded.updated_at
    ');

    $stmt->execute([
        ':session_id' => $sessionId,
        ':first_name' => $firstName,
        ':last_name'  => $lastName,
        ':mobile'     => $mobile,
        ':office'     => $office,
        ':company'    => $company,
        ':email'      => $email,
        ':address'    => $address,
        ':updated_at' => $updatedAt,
    ]);

    echo json_encode(['success' => true, 'updatedAt' => $updatedAt]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}
