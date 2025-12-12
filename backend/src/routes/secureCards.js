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
    .qr-box { width:256px; height:256px; display:flex; align-items:center; justify-content:center; background:#fff; border-radius:16px; box-shadow:0 12px 30px rgba(0,0,0,0.06); margin-top:0.5rem; }
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

    <section class="section" id="form-section" style="display:none;">
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

    <section class="section" id="result-section" style="display:none;">
      <h2 style="font-size:1rem; margin:0 0 0.6rem 0; color:#333;">Scan link</h2>
      <p class="muted">Share this link behind a QR code or short URL. Each scan will be logged in the secure dashboard.</p>
      <p id="scanUrlText" style="font-size:0.85rem; word-break:break-all;"></p>
      <div id="qrBox" class="qr-box"></div>
    </section>
  </main>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
  <script>
    (function() {
      var accessInfo = document.getElementById('accessInfo');
      var formSection = document.getElementById('form-section');
      var resultSection = document.getElementById('result-section');
      var cardForm = document.getElementById('card-form');
      var createCardBtn = document.getElementById('createCardBtn');
      var backToDashboardBtn = document.getElementById('backToDashboardBtn');
      var createStatus = document.getElementById('createStatus');
      var scanUrlText = document.getElementById('scanUrlText');
      var qrBox = document.getElementById('qrBox');

      var firstNameInput = document.getElementById('firstName');
      var lastNameInput = document.getElementById('lastName');
      var mobileInput = document.getElementById('mobile');
      var officeInput = document.getElementById('office');
      var companyInput = document.getElementById('company');
      var positionInput = document.getElementById('position');
      var emailInput = document.getElementById('email');
      var addressStreetInput = document.getElementById('addressStreet');
      var addressCityInput = document.getElementById('addressCity');
      var addressRegionInput = document.getElementById('addressRegion');
      var addressZipCountryInput = document.getElementById('addressZipCountry');

      var authToken = '';
      var currentUser = null;

      function setStatus(message, type) {
        createStatus.textContent = message || '';
        createStatus.className = 'status' + (type ? ' ' + type : '');
      }

      function renderQr(text) {
        if (!qrBox) return;
        qrBox.innerHTML = '';
        if (!text) return;
        try {
          new QRCode(qrBox, {
            text: text,
            width: 256,
            height: 256,
            correctLevel: QRCode.CorrectLevel.L
          });
        } catch (e) {
          qrBox.textContent = 'Unable to generate QR code.';
        }
      }

      function loadAuth() {
        try {
          authToken = window.localStorage.getItem('nc_auth_token') || '';
          var userJson = window.localStorage.getItem('nc_auth_user');
          if (authToken && userJson) {
            currentUser = JSON.parse(userJson);
          }
        } catch (e) {
          authToken = '';
          currentUser = null;
        }
      }

      function initAccess() {
        loadAuth();
        if (!authToken || !currentUser) {
          accessInfo.textContent = 'You are not signed in. Use the secure dashboard login first, then return here. You will be redirected now.';
          formSection.style.display = 'none';
          resultSection.style.display = 'none';
          setTimeout(function() {
            window.location.href = '/secure-dashboard';
          }, 1500);
          return;
        }

        var role = currentUser.role;
        if (role === 'cdc_admin' || role === 'tenant_admin' || role === 'manager') {
          var companyName = currentUser.tenantName || '';
          if (companyName) {
            accessInfo.textContent = 'Signed in as ' + (currentUser.displayName || currentUser.email || 'user') + ' (' + role + ') for ' + companyName + '.';
          } else {
            accessInfo.textContent = 'Signed in as ' + (currentUser.displayName || currentUser.email || 'user') + ' (' + role + ').';
          }
          formSection.style.display = 'block';
        } else {
          accessInfo.textContent = 'Your role (' + role + ') does not allow creating NameCards. Please contact your administrator.';
          formSection.style.display = 'none';
          resultSection.style.display = 'none';
        }
      }

      if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', function() {
          window.location.href = '/secure-dashboard';
        });
      }

      if (cardForm) {
        cardForm.addEventListener('submit', function(evt) {
          evt.preventDefault();

          if (!authToken) {
            setStatus('Missing auth token. Please sign in via the secure dashboard first.', 'error');
            return;
          }

          var firstName = (firstNameInput.value || '').trim();
          var lastName = (lastNameInput.value || '').trim();
          var mobile = (mobileInput.value || '').trim();

          if (!firstName || !lastName || !mobile) {
            setStatus('Please fill at least first name, last name and mobile.', 'error');
            return;
          }

          var office = (officeInput.value || '').trim();
          var company = (companyInput.value || '').trim();
          var position = (positionInput.value || '').trim();
          var email = (emailInput.value || '').trim();
          var street = (addressStreetInput.value || '').trim();
          var city = (addressCityInput.value || '').trim();
          var region = (addressRegionInput.value || '').trim();
          var zipCountry = (addressZipCountryInput.value || '').trim();

          var address = [street, city, region, zipCountry].filter(function(s) { return s; }).join('\n');

          createCardBtn.disabled = true;
          setStatus('Creating card…', '');

          fetch('/api/cards', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-auth-token': authToken
            },
            body: JSON.stringify({
              firstName: firstName,
              lastName: lastName,
              mobile: mobile,
              office: office,
              company: company,
              position: position,
              email: email,
              address: address,
              street: street,
              city: city,
              region: region,
              zipCountry: zipCountry
            })
          })
            .then(function(resp) { return resp.json(); })
            .then(function(data) {
              createCardBtn.disabled = false;
              if (!data || !data.success || !data.card || !data.card.scanUrl) {
                setStatus((data && data.message) || 'Failed to create card.', 'error');
                return;
              }

              var scanUrl = data.card.scanUrl;
              scanUrlText.textContent = scanUrl;
              renderQr(scanUrl);
              resultSection.style.display = 'block';
              setStatus('Card created.', 'ok');
            })
            .catch(function(err) {
              console.error('Error creating card via secure builder:', err);
              createCardBtn.disabled = false;
              setStatus('Error while creating card.', 'error');
            });
        });
      }

      initAccess();
    })();
  </script>
</body>
</html>`);
});

export default router;
