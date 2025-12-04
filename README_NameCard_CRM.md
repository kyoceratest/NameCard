# Name Card QR Generator & Mini CRM

This folder contains the **Name Card QR Generator** and a small **client CRM/Scanner** that we built together.

## 1. Main parts

- `index.html`
  - Employee **Name Card QR Generator** UI.
  - Generates a vCard QR code that phones can scan to add the contact.
  - New button under **Company**:
    - **"Export this company (CSV)"** – downloads employees of that company from the server database.

- `api/`
  - `save_card.php` – saves employee card data into a SQLite DB (`data/namecard.db`, table `cards`).
  - `get_card.php` – loads card data by `sessionId`.
  - `export_cards.php` – **new**: exports all cards for a given company as CSV.
    - URL: `api/export_cards.php?company=COMPANY_NAME`.
    - CSV columns: `Company, First Name, Last Name, Mobile, Office, Email, Address, Updated At`.

- `export.html` / `export.js`
  - Existing **image export** for the card.
  - Works fully in the browser (no PHP) – downloads a PNG image of the designed card.

- `clientScanner/`
  - **New mini CRM for clients, separate from employees.**
  - `scanner.html` – "Client Scanner (Beta)" UI:
    - Textarea to paste QR/vCard text.
    - Button **Parse from text** to fill fields from vCard.
    - Form to save client: first/last name, company, email, mobile, source/note.
  - `scanner.js` – logic to:
    - Parse vCard text (N, FN, TEL, EMAIL, ORG) and fill form.
    - POST client data as JSON to `clientScanner/api/add_client.php`.
  - `api/add_client.php` – saves a client into `data/crm.db`, table `clients`.
    - Fields: `first_name, last_name, company, email, mobile, source, created_at, updated_at`.
  - `clients.php` – lists clients from `data/crm.db`:
    - Table view with: ID, first/last, company, email, mobile, source, created at.
    - Buttons:
      - **Back to Client Scanner** (`scanner.html`).
      - **Export all clients (CSV)** → `clientScanner/api/export_clients.php`.
  - `api/export_clients.php` – exports **all clients** as CSV.
    - CSV columns: `ID, First Name, Last Name, Company, Email, Mobile, Source, Created At, Updated At`.

## 2. Databases

Both use **SQLite** in the `data` folder:

- `data/namecard.db`
  - Table `cards`:
    - `session_id` (PRIMARY KEY)
    - `first_name, last_name, mobile, office, company, email, address, updated_at`.

- `data/crm.db`
  - Table `clients`:
    - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
    - `first_name, last_name, company, email, mobile, source, created_at, updated_at`.

## 3. Running with PHP (important for CSV and CRM)

The PNG export (`export.html`) works on any static server, but **CSV export and CRM features require PHP**.

To test everything properly, serve this folder with a PHP‑enabled server (Apache/XAMPP, built‑in `php -S`, or another PHP host) and access it via `http://...`, **not** `file:///` or a pure static dev server.

### Minimal PHP server example (if available later)

From the `NameCard` folder:

```bash
php -S localhost:8000
```

Then in the browser:

- Name Card QR Generator: `http://localhost:8000/index.html`
- Employee CSV export: use the **"Export this company (CSV)"** button.
- Client Scanner: `http://localhost:8000/clientScanner/scanner.html`
- Clients list: `http://localhost:8000/clientScanner/clients.php`

> Note: On your current machine you might need IT help or a portable PHP to run this command. The structure above is ready for when PHP is available.

## 4. Typical flows

### 4.1 Employee side (NameCard)

1. Open `index.html` via PHP server.
2. Fill form (First/Last/Mobile/Company at minimum).
3. Generate QR → employees share this QR with clients.
4. HR can export all employees of a company as CSV using:
   - Button under Company in the form, or
   - Direct URL: `api/export_cards.php?company=COMPANY_NAME`.

### 4.2 Client side (mini CRM)

1. Open `clientScanner/scanner.html` via PHP server.
2. Paste vCard text from a scanned QR (or fill manually).
3. Click **Parse from text** to fill fields.
4. Click **Save client to CRM** → stored in `crm.db`.
5. Open `clientScanner/clients.php` to:
   - See all saved clients.
   - Export them as CSV for CRM/HR systems.

This README is meant to help you (or future you) quickly remember how the NameCard & mini‑CRM pieces fit together and what is required to run the CSV/CRM features.
