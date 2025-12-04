<?php
$rows = [];
$error = '';

try {
    $baseDir = realpath(__DIR__ . DIRECTORY_SEPARATOR . '..'); // back to clientScanner
    if ($baseDir === false) {
        throw new Exception('Invalid base directory');
    }

    $namecardDir = realpath($baseDir . DIRECTORY_SEPARATOR . '..'); // back to NameCard
    if ($namecardDir === false) {
        throw new Exception('Invalid NameCard directory');
    }

    $dataDir = $namecardDir . DIRECTORY_SEPARATOR . 'data';
    $dbPath  = $dataDir . DIRECTORY_SEPARATOR . 'crm.db';

    if (!file_exists($dbPath)) {
        $error = 'No CRM database found yet. Save a client from the scanner first.';
    } else {
        $pdo = new PDO('sqlite:' . $dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

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
    }
} catch (Exception $e) {
    $error = $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Clients List</title>
  <link rel="stylesheet" href="../cdcwebsite/styles.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body>
  <main class="container" style="padding-top: 2rem; padding-bottom: 2rem;">
    <section class="form-section">
      <h1>Clients (CRM)</h1>
      <p class="hint">
        This table shows clients saved via the Client Scanner. You can export all clients to CSV
        for use in Excel, CRM, or HR systems.
      </p>

      <div style="margin: 1rem 0; display: flex; gap: 1rem; flex-wrap: wrap;">
        <a href="scanner.html" class="export-link-button">Back to Client Scanner</a>
        <a href="api/export_clients.php" class="export-link-button">Export all clients (CSV)</a>
      </div>

      <?php if ($error): ?>
        <p class="hint" style="color:#b7695c;">Error: <?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p>
      <?php endif; ?>

      <?php if (!$error && !$rows): ?>
        <p class="hint">No clients saved yet. Use the Client Scanner to add some.</p>
      <?php endif; ?>

      <?php if ($rows): ?>
        <div style="overflow-x:auto; margin-top: 1rem;">
          <table style="width:100%; border-collapse: collapse; font-size: 0.9rem;">
            <thead>
              <tr style="border-bottom: 1px solid #ddd;">
                <th style="text-align:left; padding:0.5rem;">ID</th>
                <th style="text-align:left; padding:0.5rem;">First name</th>
                <th style="text-align:left; padding:0.5rem;">Last name</th>
                <th style="text-align:left; padding:0.5rem;">Company</th>
                <th style="text-align:left; padding:0.5rem;">Email</th>
                <th style="text-align:left; padding:0.5rem;">Mobile</th>
                <th style="text-align:left; padding:0.5rem;">Source</th>
                <th style="text-align:left; padding:0.5rem;">Created at</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($rows as $row): ?>
                <tr style="border-bottom: 1px solid #f0f0f0;">
                  <td style="padding:0.5rem;"><?php echo (int)$row['id']; ?></td>
                  <td style="padding:0.5rem;"><?php echo htmlspecialchars($row['first_name'], ENT_QUOTES, 'UTF-8'); ?></td>
                  <td style="padding:0.5rem;"><?php echo htmlspecialchars($row['last_name'], ENT_QUOTES, 'UTF-8'); ?></td>
                  <td style="padding:0.5rem;"><?php echo htmlspecialchars($row['company'], ENT_QUOTES, 'UTF-8'); ?></td>
                  <td style="padding:0.5rem;"><?php echo htmlspecialchars($row['email'], ENT_QUOTES, 'UTF-8'); ?></td>
                  <td style="padding:0.5rem;"><?php echo htmlspecialchars($row['mobile'], ENT_QUOTES, 'UTF-8'); ?></td>
                  <td style="padding:0.5rem;"><?php echo htmlspecialchars($row['source'], ENT_QUOTES, 'UTF-8'); ?></td>
                  <td style="padding:0.5rem;"><?php echo htmlspecialchars($row['created_at'], ENT_QUOTES, 'UTF-8'); ?></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      <?php endif; ?>
    </section>
  </main>
</body>
</html>
