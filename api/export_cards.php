<?php
header('Access-Control-Allow-Origin: *');

try {
    $company = isset($_GET['company']) ? trim($_GET['company']) : '';
    if ($company === '') {
        throw new Exception('Missing company parameter');
    }

    $baseDir = realpath(__DIR__ . '/..');
    if ($baseDir === false) {
        throw new Exception('Invalid base directory');
    }

    $dataDir = $baseDir . DIRECTORY_SEPARATOR . 'data';
    $dbPath  = $dataDir . DIRECTORY_SEPARATOR . 'namecard.db';

    if (!file_exists($dbPath)) {
        throw new Exception('No data database found');
    }

    $pdo = new PDO('sqlite:' . $dbPath);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Ensure company column exists (for older DBs)
    $columnsStmt = $pdo->query('PRAGMA table_info(cards)');
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

    $stmt = $pdo->prepare('SELECT company, first_name, last_name, mobile, office, email, address, updated_at
                            FROM cards
                            WHERE company = :company
                            ORDER BY last_name ASC, first_name ASC');
    $stmt->execute([':company' => $company]);

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) {
        throw new Exception('No records found for this company');
    }

    // Output CSV
    $filename = 'namecards_' . preg_replace('/[^A-Za-z0-9_-]+/', '_', $company) . '.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');

    $output = fopen('php://output', 'w');
    if ($output === false) {
        throw new Exception('Unable to open output stream');
    }

    // CSV header row
    fputcsv($output, [
        'Company',
        'First Name',
        'Last Name',
        'Mobile',
        'Office',
        'Email',
        'Address',
        'Updated At',
    ]);

    foreach ($rows as $row) {
        fputcsv($output, [
            $row['company'],
            $row['first_name'],
            $row['last_name'],
            $row['mobile'],
            $row['office'],
            $row['email'],
            $row['address'],
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
