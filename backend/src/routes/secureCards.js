import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NameCard · Secure Card Builder</title>
  <style>
    body { margin:0; padding:1.5rem; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f7eee7; }
    .page { max-width: 960px; margin: 0 auto; }
    h1 { font-size:1.6rem; margin:0 0 0.5rem 0; color:#333; }
    .brand { font-weight:600; letter-spacing:0.12em; font-size:0.8rem; color:#b66b4d; text-transform:uppercase; margin-bottom:0.75rem; }
    .section { margin-bottom:1.25rem; padding:1rem 1.1rem; background:#fff; border-radius:16px; box-shadow:0 10px 26px rgba(0,0,0,0.05); }
    label { display:block; font-size:0.8rem; color:#444; margin-bottom:0.4rem; }
    input[type="text"], input[type="email"], input[type="tel"] { width:100%; padding:0.45rem 0.55rem; border-radius:10px; border:1px solid #d9bca5; font-size:0.9rem; }
    .grid { display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; }
    @media (max-width: 720px) { .grid { grid-template-columns:1fr; } }
    .btn { display:inline-flex; align-items:center; justify-content:center; padding:0.45rem 1.1rem; border-radius:999px; font-size:0.85rem; border:1px solid #b66b4d; color:#b66b4d; background:#fff; text-decoration:none; cursor:pointer; }
    .btn:hover { background:#f1e0d4; }
    .btn[disabled] { opacity:0.6; cursor:default; }
    .status { font-size:0.8rem; margin-top:0.4rem; min-height:1.2em; }
    .status.error { color:#b00020; }
    .status.ok { color:#2f7a39; }
    .muted { font-size:0.8rem; color:#777; }
    .output-section { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:2rem; align-items:flex-start; margin-top:1.25rem; }
    .card-column { display:flex; flex-direction:column; align-items:flex-start; }
    .qr-section { background:#f9f3ec; border-radius:12px; padding:1.5rem; box-shadow:0 12px 30px rgba(0,0,0,0.06); text-align:center; }
    .qr-box { display:inline-block; background:#fff; padding:1.5rem; border-radius:12px; margin-top:1rem; box-shadow:0 4px 12px rgba(0,0,0,0.05); }
    .design-card { position:relative; border-radius:12px; overflow:hidden; box-shadow:0 12px 30px rgba(0,0,0,0.06); background:url('/image/cdcNC.png') center/cover no-repeat; min-height:260px; }
    .design-text-block { position:relative; padding:1.75rem 2.5rem; max-width:60%; }
    .design-name { font-size:1.6rem; font-weight:700; margin-bottom:0.35rem; color:#b66b4d; }
    .design-company { color:#333; font-weight:600; margin-bottom:0.9rem; }
    .design-position { font-size:1rem; font-style:italic; margin-bottom:0.6rem; color:#b66b4d; }
    .design-name-line { width:260px; height:2px; background-color:#221815; margin:0.2rem 0 0.5rem; }
    .design-line { font-size:0.95rem; margin-bottom:0.4rem; color:#b66b4d; white-space:pre-wrap; word-wrap:break-word; }
    #designAddress { white-space:pre; font-size:0.75rem; color:#b66b4d; line-height:1.1; }
    .design-contact-row { display:flex; align-items:center; justify-content:flex-start; gap:0.75rem; margin-bottom:0.5rem; }
    .design-contact-icon { width:34px; height:34px; border-radius:50%; background-color:#221815; color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:1.25rem; }
    .design-header-row { display:flex; align-items:flex-start; gap:1rem; margin-bottom:0.75rem; }
    .design-header-text { flex:1; text-align:left; }
    .design-logo { max-width:48px; height:auto; margin-bottom:0; display:block; }
    @media (max-width: 768px) {
      .design-text-block { max-width:100%; padding:1.5rem 1.5rem 1.75rem; }
    }
  </style>
</head>
<body>
  <main class="page">
    <div class="brand" style="display:flex; align-items:center; gap:0.5rem;">
      <img src="/image/logoCDC.png" alt="CDC logo" style="height:26px; border-radius:4px;" />
      <img src="/image/nom.png" alt="Cœur Du Ciel" style="height:20px;" />
      <span style="font-weight:600; letter-spacing:0.12em; font-size:0.8rem; text-transform:uppercase; color:#b66b4d;">Digital NameCard</span>
    </div>
    <h1>Secure NameCard Builder</h1>
    <p class="muted">Create database-backed NameCards for your staff. Scans will appear on the secure dashboard for your company.</p>

    <section class="section" id="access-section">
      <p id="accessInfo" class="muted"></p>
    </section>

    <section class="section" id="form-section">
      <h2 style="font-size:1rem; margin:0 0 0.6rem 0; color:#333;">Create NameCard</h2>
      <form id="card-form">
        <div class="grid">
          <div>
            <label for="firstName">First name</label>
            <input type="text" id="firstName" />
          </div>
          <div>
            <label for="lastName">Last name</label>
            <input type="text" id="lastName" />
          </div>
          <div>
            <label for="mobile">Mobile</label>
            <input type="tel" id="mobile" placeholder="+33 6 12 34 56 78" />
          </div>
          <div>
            <label for="office">Office</label>
            <input type="tel" id="office" placeholder="+33 1 23 45 67 89" />
          </div>
          <div>
            <label for="company">Company</label>
            <input type="text" id="company" />
          </div>
          <div>
            <label for="position">Post / Position</label>
            <input type="text" id="position" />
          </div>
          <div>
            <label for="email">Email</label>
            <input type="email" id="email" placeholder="name@example.com" />
          </div>
        </div>

        <div style="margin-top:0.8rem;">
          <label>Address</label>
          <div class="grid">
            <div>
              <label for="addressStreet">Street</label>
              <input type="text" id="addressStreet" />
            </div>
            <div>
              <label for="addressCity">City</label>
              <input type="text" id="addressCity" />
            </div>
            <div>
              <label for="addressRegion">State / Region</label>
              <input type="text" id="addressRegion" />
            </div>
            <div>
              <label for="addressZipCountry">ZIP, Country</label>
              <input type="text" id="addressZipCountry" />
            </div>
          </div>
        </div>

        <div style="margin-top:0.8rem; display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
          <button type="submit" id="createCardBtn" class="btn">Create card</button>
          <button type="button" id="backToDashboardBtn" class="btn">Back to dashboard</button>
        </div>
        <div id="createStatus" class="status"></div>
      </form>
    </section>

    <section class="section" id="preview-section">
      <h2 style="font-size:1rem; margin:0 0 0.6rem 0; color:#333;">Live preview</h2>
      <div class="output-section">
        <div class="card-column">
          <div id="cardPreview" class="design-card" style="max-width:560px; width:100%;">
            <div class="design-text-block">
              <div class="design-header-row">
                <img src="/image/logoCDC.png" alt="CDC" class="design-logo" />
                <div class="design-header-text">
                  <div class="design-company" id="designCompany">Company</div>
                </div>
              </div>
              <div class="design-name" id="designName">Your Name</div>
              <div class="design-name-line"></div>
              <div class="design-position" id="designPosition">Post / Position</div>
              <div class="design-contact-row">
                <span class="design-contact-icon">☎</span>
                <span class="design-line" id="designPhones">+00 0000000000</span>
              </div>
              <div class="design-contact-row">
                <span class="design-contact-icon">✉</span>
                <span class="design-line" id="designEmail">name@example.com</span>
              </div>
              <div class="design-contact-row">
                <span class="design-contact-icon">📍</span>
                <span class="design-line" id="designAddress">Address will appear here</span>
              </div>
            </div>
          </div>
        </div>
        <section class="qr-section" id="result-section" style="display:none;">
          <h2 style="font-size:1rem; margin:0 0 0.6rem 0; color:#333;">Scan link &amp; QR</h2>
          <p class="muted">Share this link behind a QR code or short URL. Each scan will be logged in the secure dashboard.</p>
          <p id="scanUrlText" style="font-size:0.85rem; word-break:break-all; margin-bottom:0.5rem;"></p>
          <div id="qrBox" class="qr-box"></div>
        </section>
      </div>
    </section>
  </main>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <script src="/secure-static/secure-cards.js"></script>
</body>
</html>`);
});

export default router;
