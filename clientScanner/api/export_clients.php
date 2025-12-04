<?php
header('Access-Control-Allow-Origin: *');

try {
    $baseDir = realpath(__DIR__ . '/..' . DIRECTORY_SEPARATOR . '..'); // back to NameCard
    if ($baseDir === false) {
        throw new Exception('Invalid base directory');
    }

    $dataDir = $baseDir . DIRECTORY_SEPARATOR . 'data';
    $dbPath  = $dataDir . DIRECTORY_SEPARATOR . 'crm.db';

    if (!file_exists($dbPath)) {
        throw new Exception('No CRM database found');
    }

    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Ensure clients table exists
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

    $stmt = $pdo->query('SELECT id, first_name, last_name, company, email, mobile, source, created_at, updated_at
                         FROM clients
                         ORDER BY datetime(created_at) DESC, id DESC');
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $filename = 'clients_export_' . date('Ymd_His') . '.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');

    $output = fopen('php://output', 'w');
    if ($output === false) {
        throw new Exception('Unable to open output stream');
    }

    // Header row
    fputcsv($output, [
        'ID',
        'First Name',
        'Last Name',
        'Company',
        'Email',
        'Mobile',
        'Source',
        'Created At',
        'Updated At',
    ]);

    foreach ($rows as $row) {
        fputcsv($output, [
            $row['id'],
            $row['first_name'],
            $row['last_name'],
            $row['company'],
            $row['email'],
            $row['mobile'],
            $row['source'],
            $row['created_at'],
            $row['updated_at'],
        ]);
    }

    fclose($output);
    exit;
} catch (Exception $e) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
    ]);
}
