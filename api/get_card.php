<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $sessionId = isset($_GET['sessionId']) ? trim($_GET['sessionId']) : '';
    if ($sessionId === '') {
        throw new Exception('Missing sessionId');
    }

    $baseDir = realpath(__DIR__ . '/..');
    if ($baseDir === false) {
        throw new Exception('Invalid base directory');
    }

    $dataDir = $baseDir . DIRECTORY_SEPARATOR . 'data';
    $dbPath = $dataDir . DIRECTORY_SEPARATOR . 'namecard.db';

    if (!file_exists($dbPath)) {
        echo json_encode(['success' => false, 'message' => 'No saved data']);
        exit;
    }

    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Ensure company column exists in case DB was created before it was added
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

    $stmt = $pdo->prepare('SELECT first_name, last_name, mobile, office, company, email, address, updated_at FROM cards WHERE session_id = :session_id');
    $stmt->execute([':session_id' => $sessionId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        echo json_encode(['success' => false, 'message' => 'No saved data for this session']);
        exit;
    }

    echo json_encode([
        'success'    => true,
        'firstName'  => $row['first_name'],
        'lastName'   => $row['last_name'],
        'mobile'     => $row['mobile'],
        'office'     => $row['office'],
        'company'    => isset($row['company']) ? $row['company'] : null,
        'email'      => $row['email'],
        'address'    => $row['address'],
        'updatedAt'  => $row['updated_at'],
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}
