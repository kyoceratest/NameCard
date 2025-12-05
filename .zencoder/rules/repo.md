---
description: Repository Information Overview
alwaysApply: true
---

# Name Card QR Generator Information

## Summary

A full-stack web application for generating vCard QR codes from contact information. Users fill a form with personal and professional details, which are instantly converted to a QR code that links to a vCard format. The application features live preview, automatic data persistence, and PNG export functionality with image rendering. Built with vanilla JavaScript, PHP, and SQLite.

## Structure

The repository is organized as a single-project application with the following directories:

- **`api/`** - PHP backend API endpoints for data persistence
- **`image/`** - Design images (card background, icons)
- **Root files** - HTML pages (index.html, export.html), JavaScript handlers (script.js, export.js), and styling (namecard.css)

## Language & Runtime

**Frontend Language**: JavaScript (ES5 compatible, vanilla)  
**Backend Language**: PHP 7.0+  
**Database**: SQLite 3  
**Package Manager**: None (uses CDN for external libraries)

## Dependencies

**External Frontend Libraries** (CDN):
- **QRCode.js** (v1.0.0) - QR code generation from text
- **Google Fonts** - Montserrat font family (weights: 300, 400, 500, 600, 700)
- **Shared styles** - References external `../cdcwebsite/styles.css`

**Backend Dependencies**:
- **PDO** (PHP Data Objects) - SQLite database abstraction
- Standard PHP extensions (JSON, file I/O)

## Build & Installation

**No build process required.** The application runs directly as static HTML with PHP backend.

**Deployment**:
```bash
Copy all files to a PHP-enabled web server directory
Ensure PHP PDO extension for SQLite is enabled
Create data/ directory with write permissions (created automatically by API on first use)
```

**File Structure After First Run**:
```
NameCard/
├── data/
│   └── namecard.db          # Auto-created SQLite database
├── api/
│   ├── save_card.php
│   └── get_card.php
├── image/
│   ├── cdcNC.png            # Card background
│   ├── camer.png
│   └── point.png
├── index.html               # Main editor page
├── export.html              # Export preview page
├── script.js                # Main form handler
├── export.js                # Export/download handler
└── namecard.css             # Styling
```

## Main Files & Resources

**Entry Points**:
- **`index.html`** (line 44-146) - Main contact form for card creation with live QR code generation
- **`export.html`** (line 1-80) - Export preview showing card with QR code and download button

**Backend APIs**:
- **`api/save_card.php`** (line 1-117) - POST endpoint storing card data to SQLite with upsert logic. Validates JSON payload, email format, and creates/migrates database schema automatically
- **`api/get_card.php`** (line 1-67) - GET endpoint retrieving saved card data by sessionId with automatic schema migration

**Frontend Logic**:
- **`script.js`** (line 1-379) - Form handler managing QR generation, vCard building, localStorage auto-save (800ms debounce), and live preview updates
- **`export.js`** (line 1-350) - Loads saved data, renders card preview, generates QR code, and draws PNG image using Canvas API with full card layout

**Styling**:
- **`namecard.css`** - Complete design system with color variables (`--bg-main`, `--accent`, etc.), card layout, form styling, and responsive design

## Data Flow

1. **User Input** → Form fields (firstName, lastName, mobile, office, company, position, email, address components)
2. **Client Processing** → `script.js` builds vCard, generates QR code, updates preview
3. **LocalStorage** → Auto-saves form data every 800ms (unchanged data skipped)
4. **Optional Backend** → `save_card.php` persists data to SQLite with sessionId (via POST)
5. **Export** → `export.html` loads data from localStorage, `export.js` renders PNG with card + QR using Canvas

## Database Schema

**SQLite Table: `cards`** (created auto by `save_card.php`)

| Column | Type | Notes |
|--------|------|-------|
| session_id | TEXT PRIMARY KEY | Unique session identifier |
| first_name | TEXT | Contact first name |
| last_name | TEXT | Contact last name |
| mobile | TEXT | Mobile phone number |
| office | TEXT | Office phone number |
| company | TEXT | Company name (added via ALTER TABLE migration) |
| email | TEXT | Email address |
| address | TEXT | Combined address |
| updated_at | TEXT | ISO 8601 timestamp |

**Schema Migrations**: Both API files include auto-migration logic to add `company` column if missing (lines 69-80 in save_card.php, lines 27-38 in get_card.php)

## Configuration

**Color Scheme** (`namecard.css` lines 1-9):
- Primary background: `#f1e3d4`
- Accent color: `#b7695c`
- Text: `#221815`

**QR Code Settings** (`script.js` line 57, `export.js` line 107):
- Error correction level: LOW (CorrectLevel.L) - allows longer vCard data
- Size: 256×256px (preview), scaled in export

**Export Canvas Dimensions** (`export.js` line 118):
- Output image: 700×900px (card + QR layout)
- Card area: centered with margins and border

## Validation Rules

**Client-side** (`index.html` lines 53-96):
- First/Last name: Letters, accented chars, spaces, hyphens, apostrophes only
- Phone fields: 6-20 chars, digits, spaces, parentheses, +/- symbols
- Email: HTML5 email type validation

**Server-side** (`save_card.php` lines 32-39):
- Empty payload check (rejects if all fields empty)
- Email format validation via `filter_var(FILTER_VALIDATE_EMAIL)`

## vCard Format

Generated vCard 3.0 format (RFC 2426) included in QR codes:

```
BEGIN:VCARD
VERSION:3.0
N:LastName;FirstName;;;
FN:First Last
TEL;TYPE=CELL,VOICE:+phone
EMAIL;TYPE=INTERNET:email@example.com
END:VCARD
```

Special characters in names are escaped (`\` → `\\`, newlines → `\n`, `,` → `\,`, `;` → `\;`).
